// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React, {useCallback, useMemo} from 'react';

import {injectIntl, WrappedComponentProps} from 'react-intl';
import styled from 'styled-components';
import {FormattedMessage} from '@kepler.gl/localization';

import LayerListFactory from './layer-panel/layer-list';
import DatasetLayerGroupFactory from './layer-panel/dataset-layer-group';
import PanelViewListToggleFactory from './panel-view-list-toggle';
import PanelTitleFactory from './panel-title';
import DatasetSectionFactory from './layer-panel/dataset-section';
import AddLayerButtonFactory from './layer-panel/add-layer-button';

import ItemSelector from '../common/item-selector/item-selector';
import {PanelLabel, SidePanelDivider, SidePanelSection} from '../common/styled-components';
import InfoHelperFactory from '../common/info-helper';

import {LAYER_BLENDINGS, OVERLAY_BLENDINGS, PANEL_VIEW_TOGGLES} from '@kepler.gl/constants';
import {Layer, LayerClassesType} from '@kepler.gl/layers';
import {UIStateActions, VisStateActions, MapStateActions, ActionHandler} from '@kepler.gl/actions';
import {SidePanelItem} from '../types';
import {PanelListView} from '@kepler.gl/types';
import {Datasets} from '@kepler.gl/table';
import {getApplicationConfig} from '@kepler.gl/utils';

type LayerBlendingSelectorProps = {
  layerBlending: string;
  updateLayerBlending: ActionHandler<typeof VisStateActions.updateLayerBlending>;
  className?: string;
} & WrappedComponentProps;

type OverlayBlendingSelectorProps = {
  overlayBlending: string;
  updateOverlayBlending: ActionHandler<typeof VisStateActions.updateOverlayBlending>;
  infoHelper: React.ReactNode;
} & WrappedComponentProps;

type LayerManagerProps = {
  datasets: Datasets;
  layers: Layer[];
  layerOrder: string[];
  layerClasses: LayerClassesType;
  layerBlending: string;
  overlayBlending: string;
  uiStateActions: typeof UIStateActions;
  visStateActions: typeof VisStateActions;
  mapStateActions: typeof MapStateActions;
  showAddDataModal: () => void;
  removeDataset: ActionHandler<typeof UIStateActions.openDeleteModal>;
  showDatasetTable: ActionHandler<typeof VisStateActions.showDatasetTable>;
  updateTableColor: ActionHandler<typeof VisStateActions.updateTableColor>;
  panelListView: PanelListView;
  panelMetadata: SidePanelItem;
  showDeleteDataset?: boolean;
} & WrappedComponentProps;

export const LayerBlendingSelector = React.memo(
  ({layerBlending, updateLayerBlending, intl, className}: LayerBlendingSelectorProps) => {
    const labeledLayerBlendings = Object.keys(LAYER_BLENDINGS).reduce(
      (acc, current) => ({
        ...acc,
        [intl.formatMessage({id: LAYER_BLENDINGS[current].label})]: current
      }),
      {}
    );

    const onChange = useCallback(
      blending => updateLayerBlending(labeledLayerBlendings[blending]),
      [updateLayerBlending, labeledLayerBlendings]
    );

    return (
      <SidePanelSection className={className}>
        <PanelLabel>
          <FormattedMessage id="layerBlending.title" />
        </PanelLabel>
        <ItemSelector
          selectedItems={intl.formatMessage({id: LAYER_BLENDINGS[layerBlending].label})}
          options={Object.keys(labeledLayerBlendings)}
          multiSelect={false}
          searchable={false}
          onChange={onChange}
        />
      </SidePanelSection>
    );
  }
);
LayerBlendingSelector.displayName = 'LayerBlendingSelector';

const InfoHelperWrapper = styled.div`
  float: right;
`;

const OverlayBlendingSelectorTitleRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const OverlayBlendingSelector = React.memo(
  ({overlayBlending, updateOverlayBlending, intl, infoHelper}: OverlayBlendingSelectorProps) => {
    const labeledOverlayBlendings = Object.keys(OVERLAY_BLENDINGS).reduce(
      (acc, current) => ({
        ...acc,
        [intl.formatMessage({id: OVERLAY_BLENDINGS[current].label})]: current
      }),
      {}
    );

    const onChange = useCallback(
      blending => updateOverlayBlending(labeledOverlayBlendings[blending]),
      [updateOverlayBlending, labeledOverlayBlendings]
    );

    return (
      <SidePanelSection>
        <OverlayBlendingSelectorTitleRow>
          <PanelLabel>
            <FormattedMessage id="overlayBlending.title" />
          </PanelLabel>
          <InfoHelperWrapper>{infoHelper}</InfoHelperWrapper>
        </OverlayBlendingSelectorTitleRow>
        <ItemSelector
          selectedItems={intl.formatMessage({id: OVERLAY_BLENDINGS[overlayBlending].label})}
          options={Object.keys(labeledOverlayBlendings)}
          multiSelect={false}
          searchable={false}
          onChange={onChange}
        />
      </SidePanelSection>
    );
  }
);
OverlayBlendingSelector.displayName = 'OverlayBlendingSelector';

LayerManagerFactory.deps = [
  LayerListFactory,
  DatasetLayerGroupFactory,
  PanelViewListToggleFactory,
  PanelTitleFactory,
  DatasetSectionFactory,
  AddLayerButtonFactory,
  InfoHelperFactory
];

function LayerManagerFactory(
  LayerList: ReturnType<typeof LayerListFactory>,
  DatasetLayerGroup: ReturnType<typeof DatasetLayerGroupFactory>,
  PanelViewListToggle: ReturnType<typeof PanelViewListToggleFactory>,
  PanelTitle: ReturnType<typeof PanelTitleFactory>,
  DatasetSection: ReturnType<typeof DatasetSectionFactory>,
  AddLayerButton: ReturnType<typeof AddLayerButtonFactory>,
  InfoHelper: ReturnType<typeof InfoHelperFactory>
) {
  const LayerManager: React.FC<LayerManagerProps> = ({
    layers,
    datasets,
    intl,
    layerOrder,
    panelListView,
    panelMetadata,
    layerClasses,
    layerBlending,
    overlayBlending,
    showAddDataModal,
    showDeleteDataset = true,
    updateTableColor,
    showDatasetTable,
    removeDataset,
    uiStateActions,
    visStateActions,
    mapStateActions
  }) => {
    const {addLayer} = visStateActions;
    const {togglePanelListView} = uiStateActions;
    const onAddLayer = useCallback(
      (dataset: string) => {
        addLayer(undefined, dataset);
      },
      [addLayer]
    );

    const onTogglePanelListView = useCallback(
      (listView: string) => {
        togglePanelListView({panelId: 'layer', listView});
      },
      [togglePanelListView]
    );

    const isSortByDatasetMode = panelListView === PANEL_VIEW_TOGGLES.byDataset;

    // temp patch to hide layers that are in development
    const enableRasterTileLayer = getApplicationConfig().enableRasterTileLayer;
    const enableWMSLayer = getApplicationConfig().enableWMSLayer;
    const filteredLayerClasses = useMemo(() => {
      let filteredClasses = layerClasses;
      if (!enableRasterTileLayer) {
        const {rasterTile: _rasterTile, ...rest} = filteredClasses;
        filteredClasses = rest as LayerClassesType;
      }
      if (!enableWMSLayer) {
        const {wms: _wms, ...rest} = filteredClasses;
        filteredClasses = rest as LayerClassesType;
      }
      return filteredClasses as LayerClassesType;
    }, [enableRasterTileLayer, enableWMSLayer, layerClasses]);

    return (
      <div className="layer-manager">
        <SidePanelSection>
          <PanelViewListToggle togglePanelListView={onTogglePanelListView} mode={panelListView} />
        </SidePanelSection>
        <DatasetSection
          datasets={datasets}
          showDatasetTable={showDatasetTable}
          updateTableColor={updateTableColor}
          removeDataset={removeDataset}
          showDeleteDataset={showDeleteDataset}
          showDatasetList={!isSortByDatasetMode}
          showAddDataModal={showAddDataModal}
        />
        <SidePanelDivider />
        <SidePanelSection>
          <PanelTitle
            className="layer-manager-title"
            title={intl.formatMessage({id: panelMetadata.label})}
          >
            <AddLayerButton datasets={datasets} onAdd={onAddLayer} />
          </PanelTitle>
        </SidePanelSection>
        <SidePanelSection>
          {isSortByDatasetMode ? (
            <DatasetLayerGroup
              datasets={datasets}
              showDatasetTable={showDatasetTable}
              layers={layers}
              updateTableColor={updateTableColor}
              removeDataset={removeDataset}
              layerOrder={layerOrder}
              layerClasses={filteredLayerClasses}
              uiStateActions={uiStateActions}
              visStateActions={visStateActions}
              mapStateActions={mapStateActions}
              showDeleteDataset={showDeleteDataset}
            />
          ) : (
            <LayerList
              layers={layers}
              datasets={datasets}
              layerOrder={layerOrder}
              uiStateActions={uiStateActions}
              visStateActions={visStateActions}
              mapStateActions={mapStateActions}
              layerClasses={filteredLayerClasses}
            />
          )}
        </SidePanelSection>
        <LayerBlendingSelector
          layerBlending={layerBlending}
          updateLayerBlending={visStateActions.updateLayerBlending}
          intl={intl}
        />
        <OverlayBlendingSelector
          overlayBlending={overlayBlending}
          updateOverlayBlending={visStateActions.updateOverlayBlending}
          intl={intl}
          infoHelper={
            <InfoHelper
              id={`overlayBlending-description`}
              description={'overlayBlending.description'}
            />
          }
        />
      </div>
    );
  };

  return injectIntl(LayerManager);
}

export default LayerManagerFactory;
