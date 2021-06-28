import React, { useContext } from 'react'
import { AcmDropdown } from '@open-cluster-management/ui-components'
import { useTranslation } from 'react-i18next'
import { ClusterContext } from '../ClusterDetails/ClusterDetails'
import { getSecret, unpackSecret } from '../../../../resources/secret'
import { createDownloadFile } from '../../../../lib/utils'

export function DownloadConfigurationDropdown(props: { getSecretAccessRestriction: boolean }) {
    const { cluster } = useContext(ClusterContext)
    const { t } = useTranslation(['cluster', 'common'])

    const downloadConfig = async (id: string) => {
        /* istanbul ignore next */
        const map: { [key: string]: string } = {
            'install-config.yaml': cluster?.hiveSecrets?.installConfig ?? '',
            kubeconfig: cluster?.hiveSecrets?.kubeconfig ?? '',
        }
        /* istanbul ignore next */
        const namespace = cluster?.namespace ?? ''
        /* istanbul ignore next */
        const clusterName = cluster?.name ?? ''
        try {
            const secret = await getSecret({ name: map[id], namespace }).promise
            const { stringData } = unpackSecret(secret)
            /* istanbul ignore next */
            const yaml = stringData?.[`${id}`] ?? ''
            createDownloadFile(`${clusterName}-${id}.yaml`, yaml)
        } catch (err) {
            console.error(err)
        }
    }

    if (cluster?.hiveSecrets) {
        const dropdownItems = [
            {
                id: 'install-config.yaml',
                text: 'install-config',
                isDisabled: props.getSecretAccessRestriction,
                tooltip: props.getSecretAccessRestriction ? t('common:rbac.unauthorized') : undefined,
            },
            {
                id: 'kubeconfig',
                text: 'kubeconfig',
                isDisabled: props.getSecretAccessRestriction,
                tooltip: props.getSecretAccessRestriction ? t('common:rbac.unauthorized') : undefined,
            },
        ]
        return (
            <AcmDropdown
                isPlain={true}
                dropdownItems={dropdownItems}
                onSelect={(id: string) => downloadConfig(id)}
                text={t('configuration.download')}
                id="download-configuration"
            />
        )
    } else {
        return null
    }
}