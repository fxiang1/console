/* Copyright Contributors to the Open Cluster Management project */

import { Fragment, useCallback, useState } from 'react'
import { AcmMultiSelect, AcmTextInput } from '../../../../../../ui-components'
import {
  Radio,
  FormGroup,
  Accordion,
  AccordionItem,
  AccordionContent,
  Popover,
  Button,
  ButtonVariant,
  SelectOption,
  SelectVariant,
} from '@patternfly/react-core'
import PlusCircleIcon from '@patternfly/react-icons/dist/js/icons/plus-circle-icon'
import TimesCircleIcon from '@patternfly/react-icons/dist/js/icons/times-circle-icon'
import HelpIcon from '@patternfly/react-icons/dist/js/icons/help-icon'
import _ from 'lodash'
import './style.css'
import { TFunction } from 'i18next'
import Tooltip from '../../../../../../components/TemplateEditor/components/Tooltip'
import { ManagedClusterSet } from '../../../../../../resources'
import { getTemplateValue } from '../../../../../Infrastructure/Clusters/ManagedClusters/CreateCluster/components/assisted-installer/utils'
import { useRecoilState, useSharedAtoms } from '../../../../../../shared-recoil'

const activeModeStr = 'active.mode'

const ClusterSelector = (props: {
  control: any
  controlId: string
  handleChange: any
  locale: string
  i18n: TFunction
  templateYAML: string
}) => {
  const { managedClusterSetsState, managedClusterSetBindingsState } = useSharedAtoms()
  const [clusterSets] = useRecoilState(managedClusterSetsState)
  const [managedClusterSetBindings] = useRecoilState(managedClusterSetBindingsState)

  const { controlId, locale, control, i18n } = props
  const { name, active, forceUpdate, validation = {} } = control
  const modeSelected = active && active.mode === true
  const isExistingRule = control.showData?.length > 0
  const isReadOnly = isExistingRule || !modeSelected
  const hasLabels = _.get(active, 'clusterLabelsList.0.labelValue') !== ''
  const [selectedClusterSets, setSelectedClusterSets] = useState<string[] | undefined>(undefined)

  control.validation = (exceptions: { row: number; text: string; type: string; controlId: string }[]) => {
    const { control, i18n } = props
    if (_.get(control, activeModeStr, false)) {
      const labelNameSet = new Set()
      control.active.clusterLabelsList.map((item: { id: number; labelName: string; validValue: boolean }) => {
        const { id, labelName, validValue } = item
        const invalidLabel = (validValue || id === 0) && (!labelName || labelName.length === 0)

        // Add exception if no input for labels or values
        if (invalidLabel) {
          exceptions.push({
            row: 1,
            text: i18n('creation.missing.clusterSelector.label'),
            type: 'error',
            controlId: `labelName-${id}`,
          })
        }
        if (labelNameSet.has(labelName)) {
          exceptions.push({
            row: 1,
            text: i18n('creation.duplicate.clusterSelector.label', [labelName]),
            type: 'error',
            controlId: `labelName-${id}`,
          })
        }
        labelNameSet.add(labelName)
      })
    }
  }

  if (_.isEmpty(active)) {
    if (!control.showData || control.showData.length === 0) {
      control.active = {
        mode: false,
        clusterLabelsList: [{ id: 0, labelName: '', labelValue: '', validValue: false }],
        clusterLabelsListID: 1,
        clusterSetsList: [],
      }
    } else {
      //display existing placement rule
      control.active = {
        mode: false,
        clusterLabelsList: control.showData,
        clusterLabelsListID: control.showData.length,
      }
    }
  }

  const handleMode = () => {
    const { control, handleChange } = props
    const { active } = control
    if (active) {
      active.mode = true
    }

    handleChange(control)
  }

  const handleChange = useCallback(
    (value: string | object, targetName?: string, targetID?: string | number) => {
      const { control, handleChange } = props

      if (targetName) {
        const { active } = control
        const { clusterLabelsList } = active
        if (clusterLabelsList && clusterLabelsList[targetID!]) {
          if (targetName === 'labelName') {
            clusterLabelsList[targetID!].labelName = value
          } else if (targetName === 'labelValue') {
            clusterLabelsList[targetID!].labelValue = value
          }
          clusterLabelsList[targetID!].validValue = true
        }
      }
      handleChange(control)
    },
    [props]
  )

  const addClusterSetToControl = (clusterSets: string[]) => {
    const { control, templateYAML } = props
    const { active } = control
    const { clusterSetsList } = active
    const namespace = getTemplateValue(templateYAML, 'namespace', '', 0)
    clusterSets.forEach((clusterSet) => {
      // check if the cluster set obj exist in clusterSetsList
      if (!clusterSetsList.find((item: { clusterSetName: string }) => item.clusterSetName === clusterSet)) {
        const existManagedClusterSetBinding = managedClusterSetBindings.find(
          (clusterSetBinding) =>
            clusterSetBinding.metadata.name === clusterSet && clusterSetBinding.metadata.namespace === namespace
        )
        clusterSetsList.push({
          clusterSetName: clusterSet,
          existManagedClusterSetBinding: existManagedClusterSetBinding ? true : false,
        })
      }
    })

    // remove deleted cluster set from clusterSetsList
    const removed = clusterSetsList.filter(
      (list: { clusterSetName: string }) => !clusterSets.includes(list.clusterSetName)
    )
    if (removed) {
      removed.forEach((list: { clusterSetName: string }) => {
        clusterSetsList.splice(
          clusterSetsList.findIndex(function (i: { clusterSetName: string }) {
            return i === list
          }),
          1
        )
      })
    }

    handleChange(control)

    setSelectedClusterSets(clusterSets)
  }

  const addLabelToList = useCallback(
    (control: any, modeSelected?: boolean) => {
      if (modeSelected) {
        // Create new "label" item
        control.active.clusterLabelsList.push({
          id: control.active.clusterLabelsListID,
          labelName: '',
          labelValue: '',
          validValue: true,
        })
        control.active.clusterLabelsListID++

        // Update UI
        forceUpdate()
      }
    },
    [forceUpdate]
  )

  const removeLabelFromList = useCallback(
    (control: { active: any }, item: { id: any }, isReadOnly?: boolean | undefined) => {
      if (!isReadOnly) {
        // Removed labels are no longer valid
        control.active.clusterLabelsList[item.id].validValue = false

        // Update UI and yaml editor
        forceUpdate()
        handleChange({})
      }
    },
    [forceUpdate, handleChange]
  )

  const renderClusterLabels = (
    control: { active: { clusterLabelsList: any[] } },
    isReadOnly: boolean | undefined,
    controlId: string,
    i18n: TFunction
  ) => {
    if (!_.get(control, 'active.clusterLabelsList')) {
      return ''
    }
    return (
      control.active &&
      control.active.clusterLabelsList.map((item) => {
        const { id, labelName, labelValue, validValue } = item
        const label = id === 0 ? i18n('clusterSelector.label.field.ui') : ''
        const value = labelName === '' ? '' : labelName
        const matchLabel = id === 0 ? i18n('clusterSelector.value.field.ui') : ''
        const matchLabelValue = labelValue === '' ? '' : labelValue

        if (validValue || id === 0) {
          return (
            <Fragment key={id}>
              <div className="matching-labels-container" style={{ display: 'flex', marginBottom: '20px' }}>
                <div className="matching-labels-input" style={{ maxWidth: '45%', marginRight: '10px' }}>
                  <AcmTextInput
                    id={`labelName-${id}-${controlId}`}
                    className="text-input"
                    label={label}
                    value={value}
                    placeholder={i18n('clusterSelector.label.placeholder.field')}
                    isDisabled={isReadOnly}
                    onChange={(value) => handleChange(value, 'labelName', id)}
                    isRequired
                  />
                </div>
                <div className="matching-labels-input">
                  <AcmTextInput
                    id={`labelValue-${id}-${controlId}`}
                    className="text-input"
                    label={matchLabel}
                    value={matchLabelValue}
                    placeholder={i18n('clusterSelector.value.placeholder.field')}
                    isDisabled={isReadOnly}
                    onChange={(value) => handleChange(value, 'labelValue', id)}
                  />
                </div>

                {id !== 0 ? ( // Option to remove added labels
                  <Button
                    id={id}
                    isDisabled={isReadOnly}
                    variant={ButtonVariant.link}
                    onClick={() => removeLabelFromList(control, item, isReadOnly)}
                    aria-label={i18n('Remove label')}
                    icon={<TimesCircleIcon />}
                    isSmall
                  />
                ) : (
                  ''
                )}
              </div>
            </Fragment>
          )
        }
        return ''
      })
    )
  }

  return (
    <Fragment>
      <div className="creation-view-controls-labels">
        <div>
          {name}
          {validation.required ? <div className="creation-view-controls-required">*</div> : null}
          <Tooltip control={control} locale={locale} />
        </div>

        <div className="clusterSelector-container" style={{ fontSize: '14px', position: 'relative' }}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div style={{ display: 'flex', alignItems: 'center' }} onClick={handleMode}>
            <Radio
              className="clusterSelector-checkbox"
              isChecked={modeSelected}
              isDisabled={isExistingRule}
              id={`clusterSelector-checkbox-${controlId}`}
              onChange={handleMode}
              name={'clusterSelector-checkbox'}
            />
            <FormGroup
              id="clusterSelector-container"
              label={i18n('creation.app.settings.clusterSelector')}
              labelIcon={
                /* istanbul ignore next */
                <Popover
                  id={`${controlId}-label-help-popover`}
                  bodyContent={i18n('creation.app.settings.selectorClusters.config')}
                >
                  <Button
                    variant="plain"
                    id={`${controlId}-label-help-button`}
                    aria-label="More info"
                    onClick={(e) => e.preventDefault()}
                    className="pf-c-form__group-label-help"
                  >
                    <HelpIcon noVerticalAlign />
                  </Button>
                </Popover>
              }
              fieldId={'clusterSelector-container'}
            />
          </div>
          <div style={!modeSelected ? { pointerEvents: 'none', opacity: 0.3 } : {}}>
            <Accordion style={{ display: 'block' }}>
              <AccordionItem>
                <AccordionContent>
                  <div className="clusterSelector-labels-section">
                    <div
                      className="labels-section"
                      style={{ display: 'block' }}
                      id={`clusterSelector-labels-section-${controlId}`}
                    >
                      <AcmMultiSelect
                        id="cluster-sets"
                        label={i18n('Cluster sets')}
                        placeholder={i18n('Select the cluster sets')}
                        value={selectedClusterSets}
                        variant={SelectVariant.typeaheadMulti}
                        onChange={(clusterSets) => addClusterSetToControl(clusterSets!)}
                        isRequired
                      >
                        {clusterSets.map((clusterset: ManagedClusterSet) => (
                          <SelectOption key={clusterset.metadata.uid} value={clusterset.metadata.name}>
                            {clusterset.metadata.name}
                          </SelectOption>
                        ))}
                      </AcmMultiSelect>
                      {renderClusterLabels(control, isReadOnly, controlId, i18n)}
                      {hasLabels && (
                        <Button
                          isDisabled={isReadOnly}
                          variant={ButtonVariant.link}
                          onClick={() => addLabelToList(control, !isReadOnly)}
                          icon={<PlusCircleIcon />}
                          isSmall
                        >
                          {i18n('creation.app.settings.selectorClusters.prop.add')}
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default ClusterSelector

export const summarize = (control: any, summary: string[]) => {
  const { clusterLabelsList } = control.active || {}
  if (clusterLabelsList && _.get(control, 'type', '') !== 'hidden' && _.get(control, activeModeStr)) {
    clusterLabelsList.forEach((item: { labelValue: string; labelName: string }) => {
      if (item.labelName && item.labelValue) {
        summary.push(`${item.labelName}=${item.labelValue}`)
      }
    })
  }
}

export const summary = (control: any) => {
  const { clusterLabelsList } = control.active || {}
  if (clusterLabelsList && _.get(control, 'type', '') !== 'hidden' && _.get(control, activeModeStr)) {
    const labels: string[] = []
    clusterLabelsList.forEach((item: { labelValue: string; labelName: string }) => {
      if (item.labelName && item.labelValue) {
        labels.push(`${item.labelName}=${item.labelValue}`)
      }
    })
    return [
      {
        term: 'Selector labels',
        desc: labels.join(', '),
      },
    ]
  }
}
