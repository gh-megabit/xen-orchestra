import _ from 'intl'
import decorate from 'apply-decorators'
import defined, { get } from '@xen-orchestra/defined'
import Icon from 'icon'
import PropTypes from 'prop-types'
import React from 'react'
import Tooltip from 'tooltip'
import { connectStore, resolveIds } from 'utils'
import { createGetObjectsOfType } from 'selectors'
import { flatten } from 'lodash'
import { injectState, provideState } from 'reaclette'
import { Select } from 'form'
import { SelectPool, SelectTag } from 'select-objects'
import SmartBackupPreview, {
  constructSmartPattern,
  destructSmartPattern,
} from 'smart-backup'

import { canDeltaBackup, FormGroup } from './../utils'

const VMS_STATUSES_OPTIONS = [
  { value: 'All', label: _('vmStateAll') },
  { value: 'Running', label: _('vmStateRunning') },
  { value: 'Halted', label: _('vmStateHalted') },
]

export const normalizeTagValues = values =>
  resolveIds(values).map(value => [value])

const SmartBackup = decorate([
  connectStore({
    hosts: createGetObjectsOfType('host'),
    vms: createGetObjectsOfType('VM'),
  }),
  provideState({
    effects: {
      setPattern: (_, value) => (_, { pattern, onChange }) => {
        onChange({
          ...pattern,
          ...value,
        })
      },
      setPowerState({ setPattern }, powerState) {
        setPattern({
          power_state: powerState === 'All' ? undefined : powerState,
        })
      },
      setPoolPattern: ({ setPattern }, { values, notValues }) => ({
        pools,
      }) => {
        setPattern({
          $pool: constructSmartPattern(
            {
              values: values || pools.values,
              notValues: notValues || pools.notValues,
            },
            resolveIds
          ),
        })
      },
      setPoolValues({ setPoolPattern }, values) {
        setPoolPattern({ values })
      },
      setPoolNotValues({ setPoolPattern }, notValues) {
        setPoolPattern({ notValues })
      },
      setTagPattern({ setPattern }, pattern) {
        const { tags } = this.state
        const { values = tags.values, notValues = tags.notValues } = pattern
        setPattern({
          tags: constructSmartPattern(
            {
              values,
              notValues,
            },
            normalizeTagValues
          ),
        })
      },
      setTagValues({ setTagPattern }, values) {
        setTagPattern({ values })
      },
      setTagNotValues({ setTagPattern }, notValues) {
        setTagPattern({ notValues })
      },
    },
    computed: {
      poolPredicate: (_, { deltaMode, hosts }) => pool =>
        !deltaMode || canDeltaBackup(get(() => hosts[pool.master].version)),
      pools: (_, { pattern }) =>
        pattern.$pool !== undefined ? destructSmartPattern(pattern.$pool) : {},
      tags: (_, { pattern }) =>
        pattern.tags !== undefined
          ? destructSmartPattern(pattern.tags, flatten)
          : {},
    },
  }),
  injectState,
  ({ state, effects, vms, pattern }) => (
    <div>
      <FormGroup>
        <label>
          <strong>{_('editBackupSmartStatusTitle')}</strong>
        </label>
        <Select
          options={VMS_STATUSES_OPTIONS}
          onChange={effects.setPowerState}
          value={defined(pattern.power_state, 'All')}
          simpleValue
          required
        />
      </FormGroup>
      <h3>{_('editBackupSmartPools')}</h3>
      <hr />
      <FormGroup>
        <label>
          <strong>{_('editBackupSmartResidentOn')}</strong>
        </label>
        <SelectPool
          multi
          onChange={effects.setPoolValues}
          predicate={state.poolPredicate}
          value={state.pools.values}
        />
      </FormGroup>
      <FormGroup>
        <label>
          <strong>{_('editBackupSmartNotResidentOn')}</strong>
        </label>
        <SelectPool
          multi
          onChange={effects.setPoolNotValues}
          value={state.pools.notValues}
        />
      </FormGroup>
      <h3>{_('editBackupSmartTags')}</h3>
      <hr />
      <FormGroup>
        <label>
          <strong>{_('editBackupSmartTagsTitle')}</strong>
        </label>
        <SelectTag
          multi
          onChange={effects.setTagValues}
          value={state.tags.values}
        />
      </FormGroup>
      <FormGroup>
        <label>
          <strong>{_('editBackupSmartExcludedTagsTitle')}</strong>
        </label>{' '}
        <Tooltip content={_('backupReplicatedVmsInfo')}>
          <Icon icon='info' />
        </Tooltip>
        <SelectTag
          multi
          onChange={effects.setTagNotValues}
          value={state.tags.notValues}
        />
      </FormGroup>
      <SmartBackupPreview vms={vms} pattern={pattern} />
    </div>
  ),
])

SmartBackup.propTypes = {
  onChange: PropTypes.func.isRequired,
  pattern: PropTypes.object.isRequired,
}

export default SmartBackup
