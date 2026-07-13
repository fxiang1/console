/* Copyright Contributors to the Open Cluster Management project */

import { t } from '~/lib/test-helpers'
import { setClusterStatus } from './NodeDetailsProviderStatuses'
import type { DetailItem, TopologyNodeWithStatus } from '../types'

jest.mock('../helpers/ansible-task', () => ({
  showAnsibleJobDetails: jest.fn(),
}))

jest.mock('../helpers/diagram-helpers', () => ({
  addDetails: jest.fn(),
  addNodeServiceLocation: jest.fn(),
  addOCPRouteLocation: jest.fn(),
  addPropertyToList: jest.fn(),
  createEditLink: jest.fn(),
  getNodePropery: jest.fn(),
}))

jest.mock('../helpers/diagram-helpers-utils', () => ({
  filterSubscriptionObject: jest.fn(),
  getActiveFilterCodes: jest.fn(),
  getClusterName: jest.fn(),
  getTargetNsForNode: jest.fn(),
  isDeployableResource: jest.fn(),
  nodeMustHavePods: jest.fn(),
  showMissingClusterDetails: jest.fn(),
}))

jest.mock('../helpers/search-helper', () => ({
  isSearchAvailable: jest.fn(),
}))

jest.mock('../../../../../lib/AcmTimestamp', () => ({
  __esModule: true,
  default: 'AcmTimestamp',
}))

jest.mock('../../../../../resources', () => ({
  ArgoApplication: {},
}))

describe('setClusterStatus', () => {
  it('enriches clusterArr with consoleURL from searchClusters', () => {
    const node = {
      id: 'member--clusters',
      type: 'cluster',
      specs: {
        clusters: [
          { name: 'cluster-a', status: 'ok' },
          { name: 'cluster-b', status: 'ok' },
        ],
        searchClusters: [
          { name: 'cluster-a', consoleURL: 'https://console.cluster-a.example.com', status: 'ok' },
          { name: 'cluster-b', consoleURL: 'https://console.cluster-b.example.com', status: 'ok' },
        ],
        clustersNames: ['cluster-a', 'cluster-b'],
      },
    } as unknown as TopologyNodeWithStatus

    const details: DetailItem[] = []
    setClusterStatus(node, details, t, 'hub-cluster')

    const combobox = details.find((d) => d.type === 'clusterdetailcombobox')
    expect(combobox).toBeDefined()

    const clusterList = combobox?.comboboxdata?.clusterList ?? []
    expect(clusterList).toHaveLength(2)

    const clusterA = clusterList.find((c) => c.name === 'cluster-a')
    const clusterB = clusterList.find((c) => c.name === 'cluster-b')
    expect(clusterA?.consoleURL).toBe('https://console.cluster-a.example.com')
    expect(clusterB?.consoleURL).toBe('https://console.cluster-b.example.com')
  })

  it('does not overwrite existing consoleURL on clusters', () => {
    const node = {
      id: 'member--clusters',
      type: 'cluster',
      specs: {
        clusters: [{ name: 'cluster-a', consoleURL: 'https://original.example.com', status: 'ok' }],
        searchClusters: [{ name: 'cluster-a', consoleURL: 'https://search-result.example.com', status: 'ok' }],
        clustersNames: ['cluster-a'],
      },
    } as unknown as TopologyNodeWithStatus

    const details: DetailItem[] = []
    setClusterStatus(node, details, t, 'hub-cluster')

    const combobox = details.find((d) => d.type === 'clusterdetailcombobox')
    const clusterList = combobox?.comboboxdata?.clusterList ?? []
    const clusterA = clusterList.find((c) => c.name === 'cluster-a')
    expect(clusterA?.consoleURL).toBe('https://original.example.com')
  })

  it('enriches Argo app clusters added from appClusters with consoleURL', () => {
    const node = {
      id: 'member--clusters',
      type: 'cluster',
      specs: {
        clusters: [],
        appClusters: ['argo-cluster'],
        searchClusters: [{ name: 'argo-cluster', consoleURL: 'https://console.argo.example.com', status: 'ok' }],
        clustersNames: [],
      },
    } as unknown as TopologyNodeWithStatus

    const details: DetailItem[] = []
    setClusterStatus(node, details, t, 'hub-cluster')

    const combobox = details.find((d) => d.type === 'clusterdetailcombobox')
    const clusterList = combobox?.comboboxdata?.clusterList ?? []
    const argoCluster = clusterList.find((c) => c.name === 'argo-cluster')
    expect(argoCluster?.consoleURL).toBe('https://console.argo.example.com')
  })

  it('works when searchClusters is absent', () => {
    const node = {
      id: 'member--clusters',
      type: 'cluster',
      specs: {
        clusters: [{ name: 'cluster-a', status: 'ok' }],
        clustersNames: ['cluster-a'],
      },
    } as unknown as TopologyNodeWithStatus

    const details: DetailItem[] = []
    setClusterStatus(node, details, t, 'hub-cluster')

    const combobox = details.find((d) => d.type === 'clusterdetailcombobox')
    const clusterList = combobox?.comboboxdata?.clusterList ?? []
    expect(clusterList).toHaveLength(1)
    expect(clusterList[0].consoleURL).toBeUndefined()
  })
})
