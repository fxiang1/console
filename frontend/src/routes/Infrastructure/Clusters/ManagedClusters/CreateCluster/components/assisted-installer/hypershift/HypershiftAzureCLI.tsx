/* Copyright Contributors to the Open Cluster Management project */

import { CodeBlock, CodeBlockCode, Content, ContentVariants } from '@patternfly/react-core'
import { ICatalogBreadcrumb } from '@stolostron/react-data-view'
import { Fragment } from 'react'
import { useTranslation } from '../../../../../../../../lib/acm-i18next'
import { DOC_LINKS, ViewDocumentationLink } from '../../../../../../../../lib/doc-util'
import { NavigationPath, useBackCancelNavigation } from '../../../../../../../../NavigationPath'
import { Actions, GetOCLogInCommand } from './common/common'
import DocPage from './common/DocPage'

export function HypershiftAzureCLI() {
  const { t } = useTranslation()
  const { back, cancel } = useBackCancelNavigation()
  const breadcrumbs: ICatalogBreadcrumb[] = [
    { label: t('Clusters'), to: NavigationPath.clusters },
    { label: t('Infrastructure'), to: NavigationPath.createCluster },
    {
      label: t('Control plane type - {{hcType}}', { hcType: 'Azure' }),
      to: NavigationPath.createAzureControlPlane,
    },
    { label: t('Create cluster') },
  ]

  const code = `# Set environment variables
export CLUSTER_NAME="example"
export RESOURCE_GROUP_NAME="example-rg"
export AZURE_BASE_DOMAIN="www.example.com"
export PULL_SECRET="example-pull-secret-file"
export AZURE_CREDS="example-azure-creds-file"
export LOCATION="eastus"

hcp create cluster azure \\
  --name $CLUSTER_NAME \\
  --resource-group-name $RESOURCE_GROUP_NAME \\
  --base-domain $AZURE_BASE_DOMAIN \\
  --pull-secret $PULL_SECRET \\
  --azure-creds $AZURE_CREDS \\
  --location $LOCATION \\
  --node-pool-replicas 3`

  const helperCommand = `hcp create cluster azure --help`

  const listItems = [
    {
      title: t('Prerequisites and Configuration'),
      content: (
        <Fragment>
          <Content component={ContentVariants.p}>{t('Download and install the Hosted Control Plane CLI.')}</Content>
          <Content component={ContentVariants.a} href={DOC_LINKS.HYPERSHIFT_DEPLOY_AZURE} target="_blank">
            {t('Follow documentation for more information.')}
          </Content>
        </Fragment>
      ),
    },
    {
      title: t('Create Azure credentials'),
      content: (
        <Fragment>
          <Content component={ContentVariants.p}>
            {t('Create an Azure credentials file for your hosted cluster.')}
          </Content>
          <Content component={ContentVariants.a} href={DOC_LINKS.HYPERSHIFT_DEPLOY_AZURE} target="_blank">
            {t('Follow documentation for more information.')}
          </Content>
        </Fragment>
      ),
    },
    {
      title: t('Create Red Hat OpenShift Container Platform pull secret'),
      content: (
        <Fragment>
          <Content component={ContentVariants.p}>
            {t('This creates a Red Hat OpenShift Container Platform pull secret.')}
          </Content>
          <a href={'https://console.redhat.com/openshift/install/pull-secret'} target="_blank" rel="noreferrer">
            {t('How do I get the Red Hat OpenShift Container Platform pull secret?')}
          </a>
        </Fragment>
      ),
    },
    {
      title: t('Create the Hosted Control Plane'),
      content: (
        <Fragment>
          <Content component={ContentVariants.h4}>{t('Log in to OpenShift Container Platform')}</Content>
          {GetOCLogInCommand()}
          <Content component={ContentVariants.h4}>{t('Run command')}</Content>
          <Content component={ContentVariants.p}>
            {t('Create the Hosted Control Plane by copying and pasting the following command:')}
          </Content>
          <CodeBlock actions={Actions(code, 'code-command')}>
            <CodeBlockCode id="code-content">{code}</CodeBlockCode>
          </CodeBlock>
          <Content component="p" style={{ marginTop: '1em' }}>
            {t('Use the following command to get a list of available parameters: ')}
          </Content>
          <CodeBlock actions={Actions(helperCommand, 'helper-command')}>
            <CodeBlockCode id="helper-command">{helperCommand}</CodeBlockCode>
          </CodeBlock>
          <ViewDocumentationLink doclink={DOC_LINKS.HYPERSHIFT_DEPLOY_AZURE} />
        </Fragment>
      ),
    },
  ]

  return (
    <DocPage
      listItems={listItems}
      breadcrumbs={breadcrumbs}
      onBack={back(NavigationPath.createAzureControlPlane)}
      onCancel={cancel(NavigationPath.managedClusters)}
    />
  )
}
