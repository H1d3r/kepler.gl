// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React, {useMemo} from 'react';
import styled from 'styled-components';
import {CompareType, Field, Merge, TooltipField} from '@kepler.gl/types';
import {CenterFlexbox} from '../common/styled-components';
import {Layers} from '../common/icons';
import PropTypes from 'prop-types';
import {notNullorUndefined} from '@kepler.gl/common-utils';
import {DataRow} from '@kepler.gl/utils';
import {Layer} from '@kepler.gl/layers';
import {
  AggregationLayerHoverData,
  LayerHoverProp,
  getTooltipDisplayDeltaValue,
  getTooltipDisplayValue
} from '@kepler.gl/reducers';
import {useIntl} from 'react-intl';
import {VisState} from '@kepler.gl/schemas';
import {capitalizeFirstLetter} from '@kepler.gl/utils';

export const StyledLayerName = styled(CenterFlexbox)`
  color: ${props => props.theme.textColorHl};
  font-size: 12px;
  letter-spacing: 0.43px;
  text-transform: capitalize;

  svg {
    margin-right: 4px;
  }
`;

const StyledTable = styled.table`
  & .row__delta-value {
    text-align: right;
    margin-left: 6px;

    &.positive {
      color: ${props => props.theme.notificationColors.success};
    }

    &.negative {
      color: ${props => props.theme.negativeBtnActBgd};
    }
  }
  & .row__value,
  & .row__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: no-wrap;
  }
`;

const StyledDivider = styled.div`
  // offset divider to reach popover edge
  margin-left: -14px;
  margin-right: -14px;
  border-bottom: 1px solid ${props => props.theme.panelBorderColor};
`;

interface RowProps {
  name: string;
  value: string;
  deltaValue?: string | null;
  url?: string;
}

const Row: React.FC<RowProps> = ({name, value, deltaValue, url}) => {
  // Set 'url' to 'value' if it looks like a url
  if (!url && value && typeof value === 'string' && value.match(/^http/)) {
    url = value;
  }

  const asImg = /<img>/.test(name);
  return (
    <tr className="layer-hover-info__row" key={name}>
      <td className="row__name">{asImg ? name.replace('<img>', '') : name}</td>
      <td className="row__value">
        {asImg ? (
          <img src={value} />
        ) : url ? (
          <a target="_blank" rel="noopener noreferrer" href={url}>
            {value}
          </a>
        ) : (
          <>
            <span>{value}</span>
            {notNullorUndefined(deltaValue) ? (
              <span
                className={`row__delta-value ${
                  deltaValue?.toString().charAt(0) === '+' ? 'positive' : 'negative'
                }`}
              >
                {deltaValue}
              </span>
            ) : null}
          </>
        )}
      </td>
    </tr>
  );
};

export type EntryInfoProps = Merge<LayerHoverProp, {fieldsToShow: TooltipField[]}>;

const EntryInfo: React.FC<EntryInfoProps> = ({fieldsToShow, ...props}) => (
  <tbody>
    {fieldsToShow.map(item => (
      <EntryInfoRow key={item.name} item={item} {...props} />
    ))}
  </tbody>
);

export type EntryInfoRowProps = {
  data: LayerHoverProp['data'];
  fields: Field[];
  layer: Layer;
  primaryData?: LayerHoverProp['primaryData'];
  compareType?: CompareType;
  currentTime?: VisState['animationConfig']['currentTime'];
  item: TooltipField;
};

const EntryInfoRow: React.FC<EntryInfoRowProps> = ({
  layer,
  item,
  fields,
  data,
  primaryData,
  compareType,
  currentTime
}) => {
  const fieldIdx = fields.findIndex(f => f.name === item.name);
  if (fieldIdx < 0) {
    return null;
  }
  const field = fields[fieldIdx];
  const fieldValueAccessor = layer.accessVSFieldValue(field, currentTime);
  const value = fieldValueAccessor(field, data instanceof DataRow ? {index: data._rowIndex} : data);

  // Handle WMS layer data in comparison mode - WMS layers don't have comparable field data
  let primaryValue = null;
  let displayDeltaValue: string | null = null;

  if (primaryData) {
    try {
      // Only calculate primary value if primaryData has a compatible structure
      if (
        primaryData instanceof DataRow ||
        (primaryData && typeof primaryData === 'object' && 'index' in primaryData)
      ) {
        primaryValue = fieldValueAccessor(
          field,
          primaryData instanceof DataRow ? {index: primaryData._rowIndex} : primaryData
        );

        displayDeltaValue = getTooltipDisplayDeltaValue({
          field,
          value,
          primaryValue,
          compareType
        });
      }
    } catch (error) {
      // If there's an error accessing primaryData (e.g., WMS layer data), skip comparison
      primaryValue = null;
    }
  }

  const displayValue = getTooltipDisplayValue({item, field, value});

  return (
    <Row
      name={field.displayName || field.name}
      value={displayValue}
      deltaValue={displayDeltaValue}
    />
  );
};

// TODO: supporting comparative value for aggregated cells as well
const CellInfo = ({
  fieldsToShow,
  data,
  layer
}: {
  data: AggregationLayerHoverData;
  fieldsToShow: TooltipField[];
  layer: Layer;
}) => {
  const {colorField, sizeField} = layer.config as any;

  const colorValue = useMemo(() => {
    if (colorField && layer.visualChannels.color) {
      const item = fieldsToShow.find(field => field.name === colorField.name);
      return getTooltipDisplayValue({item, field: colorField, value: data.colorValue});
    }
    return null;
  }, [fieldsToShow, colorField, layer, data.colorValue]);

  const elevationValue = useMemo(() => {
    if (sizeField && layer.visualChannels.size) {
      const item = fieldsToShow.find(field => field.name === sizeField.name);
      return getTooltipDisplayValue({item, field: sizeField, value: data.elevationValue});
    }
    return null;
  }, [fieldsToShow, sizeField, layer, data.elevationValue]);

  const aggregatedData = useMemo(() => {
    if (data.aggregatedData && fieldsToShow) {
      return fieldsToShow.reduce((acc, field) => {
        const dataForField = data.aggregatedData?.[field.name];
        if (dataForField?.measure && field.name !== colorField?.name) {
          acc.push({
            name: `${capitalizeFirstLetter(dataForField.measure)} of ${field.name}`,
            value: dataForField.value
          });
        }
        return acc;
      }, [] as {name: string; value?: string}[]);
    }
    return [];
  }, [data.aggregatedData, fieldsToShow, colorField?.name]);

  const colorMeasure = layer.getVisualChannelDescription('color').measure;
  const sizeMeasure = layer.getVisualChannelDescription('size').measure;
  return (
    <tbody>
      <Row name={'total points'} key="count" value={String(data.points && data.points.length)} />
      {colorField && layer.visualChannels.color && colorMeasure ? (
        <Row name={colorMeasure} key="color" value={colorValue || 'N/A'} />
      ) : null}
      {sizeField && layer.visualChannels.size && sizeMeasure ? (
        <Row name={sizeMeasure} key="size" value={elevationValue || 'N/A'} />
      ) : null}
      {aggregatedData.map((dataForField, idx) => (
        <Row name={dataForField.name} key={`data_${idx}`} value={dataForField.value || 'N/A'} />
      ))}
    </tbody>
  );
};

const LayerHoverInfoFactory = () => {
  const LayerHoverInfo = props => {
    const {data, layer} = props;
    const intl = useIntl();
    if (!data || !layer) {
      return null;
    }

    const hasFieldsToShow =
      (data.fieldValues && Object.keys(data.fieldValues).length > 0) ||
      (data.wmsFeatureData && data.wmsFeatureData.length > 0) ||
      (props.fieldsToShow && props.fieldsToShow.length > 0);

    return (
      <div className="map-popover__layer-info">
        <StyledLayerName className="map-popover__layer-name">
          <Layers height="12px" />
          {props.layer.config.label}
        </StyledLayerName>
        {hasFieldsToShow && <StyledDivider />}
        <StyledTable>
          {data.wmsFeatureData ? (
            <tbody>
              {data.wmsFeatureData.map(({name, value}, i) => (
                <Row key={i} name={name} value={value} />
              ))}
            </tbody>
          ) : data.fieldValues ? (
            <tbody>
              {data.fieldValues.map(({labelMessage, value}, i) => (
                <Row key={i} name={intl.formatMessage({id: labelMessage})} value={value} />
              ))}
            </tbody>
          ) : props.layer.isAggregated ? (
            <CellInfo {...props} />
          ) : (
            <EntryInfo {...props} />
          )}
        </StyledTable>
        {hasFieldsToShow && <StyledDivider />}
      </div>
    );
  };

  LayerHoverInfo.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.any),
    fieldsToShow: PropTypes.arrayOf(PropTypes.any),
    layer: PropTypes.object,
    data: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.any), PropTypes.object])
  };
  return LayerHoverInfo;
};

export default LayerHoverInfoFactory;
