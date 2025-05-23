/* Copyright Contributors to the Open Cluster Management project */

import { getSecret, Secret } from '../../../../../resources'
import { ClusterStatus, ResourceError } from '../../../../../resources/utils'
import { AcmAlert, AcmButton } from '../../../../../ui-components'
import { onCopy } from '../../../../../ui-components/utils'
import {
  AlertVariant,
  ButtonProps,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Skeleton,
  Tab,
  Tabs,
  TabTitleText,
  Tooltip,
} from '@patternfly/react-core'
import { CopyIcon } from '@patternfly/react-icons'
import { Fragment, useEffect, useState } from 'react'
import { useClusterDetailsContext } from '../ClusterDetails/ClusterDetails'
import { TFunction } from 'react-i18next'
import { useTranslation } from '../../../../../lib/acm-i18next'
import { useSharedAtoms, useRecoilValue } from '../../../../../shared-recoil'

export function ImportCommandContainer() {
  const { t } = useTranslation()
  const { cluster } = useClusterDetailsContext()

  const { loading, error, importCommand } = useImportCommand()

  if (loading) {
    return (
      <Card style={{ height: '276px', marginBottom: '24px' }}>
        <CardBody>
          <Skeleton height="100%" role="progressbar" screenreaderText={t('import.command.fetching')} />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return <AcmAlert isInline variant="danger" title={t('request.failed')} message={error} />
  }

  if (cluster?.status === ClusterStatus.pendingimport || cluster?.status === ClusterStatus.importfailed) {
    return (
      <>
        {cluster?.status === ClusterStatus.pendingimport && (
          <div style={{ marginBottom: '12px' }}>
            <AcmAlert isInline variant={AlertVariant.info} title={t('import.command.pendingimport')} />
          </div>
        )}
        <ImportCommand importCommand={importCommand} />
      </>
    )
  }

  return null
}

type ImportCommandProps = {
  loading?: boolean
  error?: string
  children?: React.ReactNode
  importCommand?: string
}

export function ImportCommand(props: ImportCommandProps) {
  const { t } = useTranslation()

  const [copied, setCopied] = useState<boolean>(false)
  useEffect(() => {
    /* istanbul ignore if */
    if (copied) {
      setTimeout(() => setCopied(false), 2000)
    }
  }, [copied])

  if (props.loading || props.error || !props.importCommand) {
    return null
  }

  return (
    <Fragment>
      <Card style={{ marginBottom: '24px' }}>
        <Tabs activeKey={'first'}>
          <Tab eventKey={'first'} title={<TabTitleText>{t('import.command.runcommand')}</TabTitleText>}>
            <Card>
              <CardTitle>{t('import.command.generated')}</CardTitle>
              <CardBody>
                <strong style={{ marginBottom: '12px', fontSize: '14px', display: 'block' }}>
                  {t('import.command.copy.description')}
                </strong>
                <Tooltip isVisible={copied} content={t('copied')} trigger="click">
                  <AcmButton
                    id="import-command"
                    variant="secondary"
                    icon={<CopyIcon />}
                    iconPosition="right"
                    onClick={(e: any) => {
                      onCopy(e, props.importCommand!)
                      setCopied(true)
                    }}
                  >
                    {t('import.command.copy')}
                  </AcmButton>
                </Tooltip>
              </CardBody>
              <CardTitle>{t('import.command.configurecluster')}</CardTitle>
              <CardBody>{t('import.command.configureclusterdescription')}</CardBody>
              {sessionStorage.getItem('DiscoveredClusterConsoleURL') && (
                <CardFooter>
                  <AcmButton
                    id="launch-console"
                    variant="secondary"
                    onClick={() => {
                      const location = sessionStorage.getItem('DiscoveredClusterConsoleURL')
                      if (location) {
                        window.open(location, '_blank')
                      }
                    }}
                    role="link"
                  >
                    {t('import.command.launchconsole')}
                  </AcmButton>
                </CardFooter>
              )}
            </Card>
          </Tab>
        </Tabs>
      </Card>
      {props.children}
    </Fragment>
  )
}

export async function pollImportYamlSecret(clusterName: string): Promise<Secret> {
  let retries = 20
  const poll = async (resolve: any, reject: any) => {
    getSecret({ namespace: clusterName, name: `${clusterName}-import` })
      .promise.then((secret) => resolve(secret))
      .catch((err) => {
        if (retries-- > 0) {
          setTimeout(poll, 500, resolve, reject)
        } else {
          reject(err)
        }
      })
  }
  return new Promise(poll)
}

function getImportCommand(importSecret: Secret, t: TFunction, oc?: boolean) {
  const klusterletCRD = importSecret.data?.['crds.yaml']
  const importYaml = importSecret.data?.['import.yaml']
  const alreadyImported = t('import.command.alreadyimported')
  const alreadyImported64 = Buffer.from(alreadyImported).toString('base64')
  const cliLib = oc ? 'oc' : 'kubectl'
  return `echo "${klusterletCRD}" | base64 -d | ${cliLib} create -f - || test $? -eq 0 && sleep 2 && echo "${importYaml}" | base64 -d | ${cliLib} apply -f - || echo "${alreadyImported64}" | base64 -d`
}

export const useImportCommand = (oc?: boolean) => {
  const { t } = useTranslation()
  const { secretsState } = useSharedAtoms()
  const secrets = useRecoilValue(secretsState)
  const { cluster } = useClusterDetailsContext()
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState<boolean>(false)
  const [importSecret, setImportSecret] = useState<Secret | undefined>(undefined)

  // do not show command if it's configured to auto-import
  const autoImportSecret = secrets.find(
    (s) => s.metadata.namespace === cluster?.namespace && s.metadata.name === 'auto-import-secret'
  )

  useEffect(() => {
    if (
      cluster?.name &&
      !cluster?.isHive &&
      !error &&
      !loading &&
      !importSecret &&
      !autoImportSecret &&
      [ClusterStatus.importfailed, ClusterStatus.pendingimport].includes(cluster?.status)
    ) {
      setLoading(true)
      pollImportYamlSecret(cluster?.name)
        .then((secret: Secret) => setImportSecret(secret))
        .catch((err) => {
          const resourceError = err as ResourceError
          setError(resourceError.message)
        })
        .finally(() => setLoading(false))
    }
  }, [cluster, error, loading, importSecret, autoImportSecret])

  const importCommand = importSecret ? getImportCommand(importSecret, t, oc) : undefined

  return { importCommand, loading, error, autoImportSecret }
}

type CopyCommandButtonProps = {
  loading?: boolean
  error?: string
  children?: React.ReactNode
  variant?: ButtonProps['variant']
  isInline?: boolean
  command: string
}

export const CopyCommandButton = ({ loading, error, children, variant, isInline, command }: CopyCommandButtonProps) => {
  const { t } = useTranslation()

  const [copied, setCopied] = useState<boolean>(false)
  useEffect(() => {
    /* istanbul ignore if */
    if (copied) {
      setTimeout(() => setCopied(false), 2000)
    }
  }, [copied])

  if (loading || error || !command) {
    return null
  }

  return (
    <Tooltip isVisible={copied} content={t('copied')} trigger="click">
      <AcmButton
        id="import-command"
        variant={variant || 'secondary'}
        icon={<CopyIcon />}
        iconPosition="right"
        onClick={(e: any) => {
          onCopy(e, command)
          setCopied(true)
        }}
        isInline={isInline}
      >
        {children || t('import.command.copy')}
      </AcmButton>
    </Tooltip>
  )
}
