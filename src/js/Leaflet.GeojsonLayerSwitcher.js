export default function(L) {

	const commonStyle = {
		opacity: 1,
		weight: 5,
		dashArray: '10, 30',
	};

	const GeoJSONLayerSwitcher = L.GeoJSONLayerSwitcher = L.Handler.extend({

		options: {
			propertyStateSelected: 'selected',
			style: Object.assign({color: '#f00'}, commonStyle),
			styleSelected: Object.assign({color: '#0f0'}, commonStyle),
			selectButton: {
				icon: 'fa-plus',
				bgColor: '#4caf50'
			},
			deselectButton: {
				icon: 'fa-minus',
				bgColor: '#f00'
			},
			popupAnchor: [10, 60],
		},

		initialize: function(map, options) {
			L.Handler.prototype.initialize.call(this, map);
			L.Util.setOptions(this, options || {});

			const context = this;

			this._dialog = L.control.dialog({
				initOpen: false,
				size: [300, 160],
				anchor: context.options.popupAnchor,
			});

			this._geoJSONLayer = L.geoJson(null, {
				style: function(feature) {
					if (!feature.properties.hasOwnProperty(context.options.propertyStateSelected)) {
						feature.properties[context.options.propertyStateSelected] = false;
					}
					return context._getStyleFor(feature);
				},
				onEachFeature: function(feature, layer) {
					const style = context._getStyleFor(feature);
					if (L.PolylineDecorator && style.hasOwnProperty('patterns')) {
						layer.decorator = L.polylineDecorator(layer, {
							patterns: style.patterns
						});
						layer.decorator.addTo(context._map);
					}
				}
			});
		},

		_getStyleFor: function(feature) {
			return (feature.properties && feature.properties[this.options.propertyStateSelected]) ? this.options.styleSelected : this.options.style;
		},

		addHooks: function() {
			this._geoJSONLayer.addTo(this._map);
			this._dialog.addTo(this._map);
			const dialogContent = this._initDialogContent();
			this._dialog.setContent(dialogContent);
		},

		removeHooks: function() {
			this._geoJSONLayer.getLayers().forEach(layer => {
				if (L.PolylineDecorator && layer.hasOwnProperty('decorator')) {
					this._map.removeLayer(layer.decorator);
				}
			});
			this._geoJSONLayer.clearLayers();
			this._map.removeLayer(this._geoJSONLayer);
			this._dialog.close();
			this._map.removeControl(this._dialog);
		},

		addData: function(geojson) {
			this._geoJSONLayer.addData(geojson);
			const layers = this._geoJSONLayer.getLayers();

			this._index = 0;
			this._count = layers.length;
			if (layers.length > 0) {
				this._goTo(layers[0]);
			}
			this._dialog.open();
			return this;
		},

		_initDialogContent: function() {
			let container = L.DomUtil.create('div');

			this._navTitle = L.DomUtil.create('h4', 'leaflet-geoJSONLayerSwitcher-title', container);
			let navBar = L.DomUtil.create('div', 'leaflet-geoJSONLayerSwitcher-navbar', container);

			this._prevButton = L.DomUtil.create('a', 'leaflet-geoJSONLayerSwitcher prev', navBar);
			L.DomUtil.create('i', 'fa fa-chevron-left', this._prevButton);

			this._switchButton = L.DomUtil.create('a', 'leaflet-geoJSONLayerSwitcher switch', navBar);
			this._switchButtonIcon = L.DomUtil.create('i', 'fa', this._switchButton);

			this._nextButton = L.DomUtil.create('a', 'leaflet-geoJSONLayerSwitcher next', navBar);
			L.DomUtil.create('i', 'fa fa-chevron-right', this._nextButton);

			const context = this;

			L.DomEvent.on(this._prevButton, 'click', function() {
				context._previous();
			}, this);

			L.DomEvent.on(this._nextButton, 'click', function() {
				context._next();
			}, this);

			L.DomEvent.on(this._switchButton, 'click', function() {
				context._toggle();
			}, this);

			return container;
		},

		_index: 0,
		_count: 0,

		_previous: function() {
			this._index = (this._index + this._count - 1) % this._count;
			this._goTo(this._currentLayer());
		},

		_next: function() {
			this._index = (this._index + 1) % this._count;
			this._goTo(this._currentLayer());
		},

		_goTo: function(layer) {
			if (layer === null) {
				return;
			}
			this._focus(layer);
			this._updateDialogFor(layer);
		},

		_toggle: function() {
			let layer = this._currentLayer();
			if (layer === null) {
				return;
			}

			if (L.PolylineDecorator && layer.hasOwnProperty('decorator')) {
				this._map.removeLayer(layer.decorator);
				delete layer.decorator;
			}

			layer.feature.properties[this.options.propertyStateSelected] = !layer.feature.properties[this.options.propertyStateSelected];

			const style = this._getStyleFor(layer.feature);
			layer.setStyle(style);

			if (L.PolylineDecorator && style.hasOwnProperty('patterns')) {
				layer.decorator = L.polylineDecorator(layer, {
					patterns: style.patterns
				});
				layer.decorator.addTo(this._map);
			}

			this._updateToggleButtonFor(layer);
		},

		_updateDialogFor: function(layer) {
			if (layer === null) {
				this._dialog.close();
				return;
			}

			const readableIndex = this._index + 1;
			this._navTitle.innerHTML = readableIndex+'/'+this._count;
			this._updateToggleButtonFor(layer);
		},

		_updateToggleButtonFor: function(layer) {
			if (layer.feature.properties[this.options.propertyStateSelected]) {
				this._switchButtonIcon.classList.remove(this.options.selectButton.icon);
				this._switchButtonIcon.classList.add(this.options.deselectButton.icon);
				this._switchButton.style.backgroundColor = this.options.deselectButton.bgColor;
			} else {
				this._switchButtonIcon.classList.remove(this.options.deselectButton.icon);
				this._switchButtonIcon.classList.add(this.options.selectButton.icon);
				this._switchButton.style.backgroundColor = this.options.selectButton.bgColor;
			}
		},

		_focus: function(layer) {
			if (layer === null) {
				return;
			}
			this._map.fitBounds(layer.getBounds());
		},

		_currentLayer: function() {
			if (this._count === 0) {
				return null;
			}
			return this._geoJSONLayer.getLayers()[this._index];
		},

		getSelection: function() {
			let selection = [];
			this._geoJSONLayer.getLayers().forEach(layer => {
				if (layer.feature.properties[this.options.propertyStateSelected]) {
					selection.push(layer);
				}
			});
			return selection;
		},
	});

	// Factory
	L.geoJSONLayerSwitcher = function(map, options) {
		return new GeoJSONLayerSwitcher(map, options);
	};

	return GeoJSONLayerSwitcher;
}
