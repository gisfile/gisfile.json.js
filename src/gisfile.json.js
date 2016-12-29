/*
 * L.GisFileJson turns GisFile API box (http://gisfile.com/api/1.0/doc/box) data into a Leaflet layer.
 */
/*
if (!L.Util.template) {
    L.Util.template = function (str, data) {
        return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
            var value = data[key];
            if (!data.hasOwnProperty(key)) {
                throw new Error('No value provided for variable ' + str);
            } else if (typeof value === 'function') {
                value = value(data);
            }

            return value;
        });
    }
}
*/
L.GisFileTip = L.Class.extend({
    initialize: function (map) {
        this._map = map;
        this._popupPane = map._panes.popupPane;
        this._container = L.DomUtil.create('div', 'leaflet-tooltip', this._popupPane);
    },

    dispose: function () {
        if (this._container) {
            this._popupPane.removeChild(this._container);
            this._container = null;
        }
    },

    updateContent: function (labelText) {
        if (!this._container) {
            return this;
        }
        L.DomUtil.addClass(this._container, 'leaflet-tooltip-single');
        this._container.innerHTML = '<span>' + labelText.text + '</span>';
        return this;
    },

    updatePosition: function (latlng) {
        var pos = this._map.latLngToLayerPoint(latlng),
            tooltipContainer = this._container;

        if (this._container) {
            tooltipContainer.style.visibility = 'inherit';
            L.DomUtil.setPosition(tooltipContainer, pos);
        }

        return this;
    }
});

L.GisFileJson = L.Class.extend({
    includes: L.Mixin.Events
    , timer: null
    , mouseMoveTimer: null
    , counter: 0
    , options: {
        url: '//gisfile.com/layer/{l}/{z}/{x}/{y}.json'
        , layer: ''
        , opacity: 1
        , attribution: '<a href="http://gisfile.com" target="_blank">GISFile</a>'
        , showobjects: true
        , showfield: 'name'
        , minZoom : 0
        , maxZoom : 20
        , minSize : 10
    }

    , initialize: function (options) {
        var that = this;
        L.setOptions(that, options);
        that._hash = {};
        that._tiles = {};
        that._mouseIsDown = false;
        that._popupIsOpen = false;
    }

    , setOptions: function (newOptions) {
        var that = this;
        L.setOptions(that, newOptions);
        that._update();
    }

    , onAdd: function (map) {
        var that = this;
        that._map = map;

        if (L.GisFileTip) {
            that._tips = new L.GisFileTip(that._map);
        }

        map.on('viewreset', that._update, that);
        map.on('moveend', that._update, that);
        map.on('zoomend', that._update, that);
        map.on('mousemove', that._mousemove, that);
        map.on('mouseout', that._mouseout, that);
        map.on('mousedown', that._mousedown, that);
        map.on('mouseup', that._mouseup, that);
        map.on('popupopen', that._popup_open, that);
        map.on('popupclose', that._popup_close, that);

        that._update();
    }

    , onRemove: function (map) {
        var that = this;

        map.off('viewreset', that._update, that);
        map.off('moveend', that._update, that);
        map.off('zoomend', that._update, that);
        map.off('mousemove', that._mousemove, that);
        map.off('mouseout', that._mouseout, that);
        map.off('mousedown', that._mousedown, that);
        map.off('mouseup', that._mouseup, that);
        map.off('popupopen', that._popup_open, that);
        map.off('popupclose', that._popup_close, that);
        
        if (L.GisFileTip && this._tips != undefined) {
            this._tips.dispose();
            that._tips = null;
        }
        
        this._popup_close();
        this._hideFeature();
        
        if (this._layer) {
            this._layer.clearLayers();
            if (this._map.hasLayer( this._layer))
                this._map.removeLayer( this._layer);
        }        
        
        if (this._lable && this._map.hasLayer( this._lable)) {
            this._lable.clearLayers();
            this._map.removeLayer( this._lable);
        }
    }

   , addTo: function (map) {
        map.addLayer(this);
        return this;
    }

    , getAttribution: function () {
        return this.options.attribution;
    }

    , _hideFeature: function () {
    	var that = this;
        if (that._feature && !that._popupIsOpen) {
            that._feature.geometry.off('mouseout');
            
            if (!that.options.showobjects || (that._layer && !that._layer.hasLayer( that._feature.geometry))) {
                that._map.removeLayer(that._feature.geometry);
            } else {
                var type = that._feature.type;
                
                if (type == "Point") {
                    
                } else {
                    if (type == "LineString") {
                        that._feature.geometry.setStyle( {fillColor: 'none', weight: 3, opacity: 1, color: '#049BFF'});
                    } else {
                        that._feature.geometry.setStyle( {fillColor: 'none', weight: 1, opacity: 1, color: '#A9A9A9'});
                    }
                
                    if (that.options.style) {
                        that._feature.geometry.setStyle(that.options.style(that._feature));
                    }
                }
            }
            
            that._feature = null;
        }
    }

    , _showHash:function() {
        if (this._layer && this._map.hasLayer( this._layer)) {
            this._layer.clearLayers();
            this._map.removeLayer( this._layer);
        }

        if (!this._layer) {
            this._layer = L.layerGroup();
        }

        if (!this._map.hasLayer( this._layer)) {
            this._map.addLayer( this._layer);
        }
        
        if (this.options.lable) {
            if (this._lable && this._map.hasLayer( this._lable)) {
                this._lable.clearLayers();
                this._map.removeLayer( this._lable);
            }
            
            if (!this._lable) {
                this._lable = L.layerGroup();
            }
            
            if (!this._map.hasLayer( this._lable)) {
                this._map.addLayer( this._lable);
            }
        }

        var zoom = this._map.getZoom();
        
        if (zoom >= this.options.minZoom && zoom <= this.options.maxZoom) {
            for (var i in this._hash) {
                this._drawHash( this._hash[i]);
            } 
        } else {
            if (L.GisFileTip && this._tips != undefined && this._tips != null) {
                this._hideFeature();
                this._tips.dispose();
                this._tips = null;
            }
        }
    }

    , _drawHash:function(hash) {
        var bounds = this._map.getBounds();       
        var p1 = this._map.latLngToLayerPoint( hash.bounds.getSouthWest());
        var p2 = this._map.latLngToLayerPoint( hash.bounds.getNorthEast());

        if (hash.type == "Point" || p1.x -p2.x >= this.options.minSize || p1.y -p2.y >= this.options.minSize)
        {
            if (bounds.contains( hash.bounds) || bounds.intersects( hash.bounds)) {
                if (hash.type == "Point") {
                    
                } else {
                    if (hash.type == "LineString") {
                        hash.geometry.setStyle( {fillColor: 'none', weight: 3, opacity: 1, color: '#049BFF'});
                    } else {
                        hash.geometry.setStyle( {fillColor: 'none', weight: 1, opacity: 1, color: '#A9A9A9'});
                    }
                    /*
                    if (this._styleIndex && hash.style && this._styleIndex[ hash.style]) {
                        var c = this.get1( this._styleIndex[ hash.style], "color");
                    }
                    */
                    if (this.options.style) {
                        hash.geometry.setStyle(this.options.style(hash));
                    }
                }

                if (!this._map.hasLayer( hash.geometry)) {
                    hash.geometry.addTo(this._layer);
                }

                if (hash.type == "Point" || p1.x -p2.x >= this.options.minSize || p1.y -p2.y >= this.options.minSize) {
                    if (this.options.lable && this.options.lable.name) {
                        var xy = hash.bounds.getCenter(), s = hash.properties[ this.options.lable.name] != undefined ? hash.properties[ this.options.lable.name] : "";
                        if (this.options.lable.area) s = s +" " +parseFloat( hash.properties[ this.options.lable.area]).toFixed(2);
                        var l = new L.LabelOverlay( xy, s.trim(), {
                            minZoom: this.options.lable.minZoom ? this.options.lable.minZoom : this.options.minZoom, 
                            maxZoom: this.options.lable.maxZoom ? this.options.lable.maxZoom : this.options.maxZoom});
                        this._lable.addLayer( l);
                    }
                }
            }
        }
    }
    
    , _showFeature:function(feature, point) {
    	var that = this;
        if (!((that._feature && that._feature.id==feature.id) || that._popupIsOpen)) {
            that._hideFeature();
            
            that._feature = feature;
            
            if (feature.type == "Point") {
                //point = feature.geometry._latlng;
            } else {
                if (feature.type == "LineString") 
                    feature.geometry.setStyle( {fillColor: 'blue', weight: 3, opacity: 0.3, color: 'blue'});
                else
                    feature.geometry.setStyle( {fillColor: 'blue', weight: 1, opacity: 0.3, color: 'blue'});

                if (that.options.style) {
                    that._feature.geometry.setStyle(that.options.style(that._feature));
                }
            }
            
            if (that.options.onActiveFeature) {
                that.options.onActiveFeature(that._feature, that._feature.geometry);
            }

            if (L.GisFileTip && that._feature.properties) {
                if (that._tips == null) that._tips = new L.GisFileTip(that._map);
                that._tips.updateContent({ text: that._feature.properties[ that.options.showfield]});
                that._tips.updatePosition( point); //that._feature.bounds.getCenter());
            }

            that._feature.geometry
            .on('mouseout', function (e) {
                var size = that._map.getSize();
                var point = e.containerPoint ? e.containerPoint : e.originalEvent;
                if (point.x<0 || point.y<0 || point.x>(size.x-10) || point.y>(size.y-10)) {
                    that._hideFeature();
                }
                if (L.GisFileTip) {
                    this._tips = null;
                }
            })
            .addTo(that._map);
        }
    }

    , _mousemove: function (e) {
    	var that = this;
        var zoom = this._map.getZoom();
        
        if (zoom >= this.options.minZoom && zoom <= this.options.maxZoom) 
    	//if (!that._mouseIsDown) 
        {
            var point = e.latlng
                , features = that._filter(that._hash, function (item) {
                    var p1 = that._map.latLngToLayerPoint( item.bounds.getSouthWest());
                    if (item.type == "Point") {
                        var p2 = that._map.latLngToLayerPoint( point);
                        return (Math.abs(p1.x -p2.x) <= that.options.minSize && (p1.y -p2.y) > 0 && (p1.y -p2.y) <= 40)
                    } else {
                        var p2 = that._map.latLngToLayerPoint( item.bounds.getNorthEast());
                        return ((p1.x -p2.x >= that.options.minSize || p1.y -p2.y >= that.options.minSize) && item.bounds.contains(point) && that._pointInPolygon(point, item.geometry))
                    }
                });
            if (features.length>0) {
                var feature = (features.length == 1 ? features[0] : that._chooseBestFeature(features));
                    that._showFeature(feature, e.latlng);
            } else {
                that._hideFeature();
            }
    	}
    }

    , _mousedown: function () {
    	this._mouseIsDown = true;
    }

    , _mouseup: function () {
    	this._mouseIsDown = false;
    }

    , _mouseout: function () {
        this._hideFeature();
    }

    , _popup_open: function () {
    	this._popupIsOpen = true;
    }

    , _popup_close: function () {
    	this._popupIsOpen = false;
    }

    , _chooseBestFeature: function (features) {
        var that = this
            //, bestLookingArea = that._boundsArea(that._map.getBounds())/12
            , bestFeatureIndex = 0
            , bestFeatureScale = that._boundsArea(features[0].bounds); //bestLookingArea;

        //if (bestFeatureScale < 1) {bestFeatureScale = 1/bestFeatureScale}

        for (var i=1; i<features.length;i++) {
            var featureArea = that._boundsArea(features[i].bounds)
              , featureScale = featureArea; //bestLookingArea;
            //if (featureScale < 1) {featureScale = 1/featureScale}

            if (featureScale<bestFeatureScale) {
                bestFeatureIndex = i;
                bestFeatureScale = featureScale;
            }
        }

        return features[bestFeatureIndex];
    }

    , _boundsArea: function(bounds) {
        var sw = bounds.getSouthWest()
            , ne = bounds.getNorthEast();
        return (ne.lat-sw.lat)*(ne.lat-sw.lat)+(ne.lng-sw.lng)*(ne.lng-sw.lng)
    }

    , _filter: function(obj, predicate) {
        var res=[];
        
        $.each(obj, function(index,item) {
            if (predicate(item)) {res.push(item)}
        });

        return res;
    }

    , _pointInPolygon: function (point, polygon) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        var x = point.lng
        , y = point.lat
        , poly = polygon.getLatLngs()
        , inside = false;

        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {

            var xi = poly[i].lng, yi = poly[i].lat
            , xj = poly[j].lng, yj = poly[j].lat
            , intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;

        }

        return inside;
    }

    , _update: function () {
        
        var that = this;

        if (that.timer) {
            window.clearTimeout(that.timer);
        }

        that.timer = window.setTimeout(function() {
            if (that.options.showobjects) {
                that._showHash();
            }

            var zoom = that._map.getZoom();
                
            if (zoom > that.options.maxZoom || zoom < that.options.minZoom) {
                return;
            }

            var tbounds = that._map.getPixelBounds(),
                tileSize = 256;

            var bounds = L.bounds(
                tbounds.min.divideBy(tileSize)._floor(),
                tbounds.max.divideBy(tileSize)._floor());

            var queue = [], center = bounds.getCenter();
            var j, i, point;

            for (j = bounds.min.y; j <= bounds.max.y; j++) {
                for (i = bounds.min.x; i <= bounds.max.x; i++) {
                    point = new L.Point(i, j);

                    if (that._tileShouldBeLoaded(point)) {
                        queue.push(point);
                    }
                }
            }

            var tilesToLoad = queue.length;
            if (tilesToLoad === 0) { return; }

            queue.sort(function (a, b) {
                return a.distanceTo(center) - b.distanceTo(center);
            });
            
            that.counter += tilesToLoad;

            for (i = 0; i < tilesToLoad; i++) {
                that._loadTile( queue[i]);
            }
        },0);
    },

    // -------------------------------------------------------------------------
    
    _loadTile: function (tilePoint) {
        var that = this;
        this._adjustTilePoint(tilePoint);
        var url = that.getTileUrl(tilePoint);
        
        if (url.indexOf( ".zson") == -1 && url.indexOf( ".zip") == -1) {
            $.ajax({
                url : url
                , async: true
                , success: function(data) {
                    if (data) {
                        that.parseGeoJson(data, that);
                    }
                    that._tiles[tilePoint.x + ':' +tilePoint.y] = '';
                    that.counter--;
                }
            })            
        } else if (JSZip) {
            if (window.XMLHttpRequest === undefined) {
                window.XMLHttpRequest = function() {
                    try {
                        return new ActiveXObject("Microsoft.XMLHTTP.6.0");
                    }
                    catch (e1) {
                        try {
                            return new ActiveXObject("Microsoft.XMLHTTP.3.0");
                        }
                        catch (e2) {
                            throw new Error("XMLHttpRequest is not supported");
                        }
                    }
                };
            }

            var oReq = new XMLHttpRequest();
            oReq.open("GET", url, true);
            oReq.responseType = "arraybuffer";
            oReq.onload = function (oEvent) {
                if (oReq.response && oReq.response.byteLength > 0) {
                    var arrayBuffer = oReq.response;
                    if (arrayBuffer) {
                        var z = new JSZip();
                        z.load(arrayBuffer);

                        $.each(z.files, function (index, zipEntry) {
                            var data = z.file(zipEntry.name).asText();
                            that.parseGeoJson(data, that);
                        })
                    }
                }
                that._tiles[tilePoint.x + ':' +tilePoint.y] = '';
                that.counter--;
            };
            oReq.send(null);
        }
    },

    parseGeoJson: function (data, that) {
        if (typeof data == 'string') {
            data = JSON.parse(data);
        }

        for (var i=0;i<data.length;i++) 
        {
            var item = data[i];
            var id = parseInt( item.id);
            var geometry = item.type === 'Feature' ? item.geometry : item,
                coords = geometry ? geometry.coordinates : null
            if (coords && geometry) {
                if (that._hash[id] == undefined) {
                    var pro = {}, obj = undefined;
                    pro[ "id"] = id;
                    pro[ "type"] = geometry.type;
                    pro[ "properties"] = item.properties;
                    switch (geometry.type) {
                        case 'Point':
                            var latlng = this.coordsToLatLng(coords);
                            obj = new L.Marker(latlng);
                            break;
                        case 'MultiPoint':
                            var latlngs = [];
                            for (var i = 0, len = coords.length; i < len; i++) {
                                latlng = this.coordsToLatLng(coords[i]);
                                latlngs.push( new L.Marker(latlng));
                            }
                            obj = new L.FeatureGroup(latlngs);
                            break;
                        case 'LineString':
                        case 'MultiLineString':
                            var latlngs = this.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, that.coordsToLatLng);
                            obj = new L.Polyline(latlngs); //, options);
                            break;
                        case 'Polygon':
                        case 'MultiPolygon':
                            var latlngs = that.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, that.coordsToLatLng);
                            obj = new L.Polygon(latlngs);
                            break;
                    }
                    if (obj != undefined) {
                        pro[ "geometry"] = obj;
                        that._hash[id] = pro;
                    }
                }

                if (!that._hash[ id].bounds && that._hash[ id].geometry) {
                    if (that._hash[ id].geometry._latlng) {
                        that._hash[ id].bounds = L.latLngBounds(that._hash[ id].geometry._latlng,that._hash[ id].geometry._latlng);
                    } else if (that._hash[ id].geometry._latlngs) {
                        that._hash[ id].bounds = that._hash[ id].geometry.getBounds();
                    }
                }

                if (that.options.showobjects) {
                    that._drawHash( that._hash[ id]);
                }               
            }
        }                    
    },

    coordsToLatLng: function (coords) {
        if (coords.length == 3)
            return new L.LatLng(coords[1], coords[0], coords[2]);
        else
            return new L.LatLng(coords[1], coords[0], 0);
    },
    
    coordsToLatLngs: function (coords, levelsDeep, coordsToLatLng) {
        var latlngs = [];

        for (var i = 0, len = coords.length, latlng; i < len; i++) {
            latlng = levelsDeep ?
                    this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
                    (coordsToLatLng || this.coordsToLatLng)(coords[i]);

            latlngs.push(latlng);
        }

        return latlngs;
    },
    
    _tileShouldBeLoaded: function (tilePoint) {
        if ((tilePoint.x + ':' + tilePoint.y) in this._tiles) {
            return false; // already loaded
        }

        var options = this.options;

        if (!options.continuousWorld) {
            var limit = this._getWrapTileNum();

            // don't load if exceeds world bounds
            if ((options.noWrap && (tilePoint.x < 0 || tilePoint.x >= limit)) ||
                tilePoint.y < 0 || tilePoint.y >= limit) { return false; }
        }

        if (options.bounds) {
            var tileSize = options.tileSize,
                nwPoint = tilePoint.multiplyBy(tileSize),
                sePoint = nwPoint.add([tileSize, tileSize]),
                nw = this._map.unproject(nwPoint),
                se = this._map.unproject(sePoint);

            // TODO temporary hack, will be removed after refactoring projections
            // https://github.com/Leaflet/Leaflet/issues/1618
            if (!options.continuousWorld && !options.noWrap) {
                nw = nw.wrap();
                se = se.wrap();
            }

            if (!options.bounds.intersects([nw, se])) { return false; }
        }

        return true;
    },
    
    getTileUrl: function (tilePoint) {
        return L.Util.template(this.options.url, L.extend({
            s: '',
            l: this.options.layer,
            z: tilePoint.z,
            x: tilePoint.x,
            y: tilePoint.y
        }, this.options));
    },
    
    _getZoomForUrl: function () {
        var options = this.options,
            zoom = this._map.getZoom();

        //if (options.zoomReverse) {
        //    zoom = options.maxZoom - zoom;
        //}

        return zoom; // +options.zoomOffset;
    },
    
    _getWrapTileNum: function () {
        // TODO refactor, limit is not valid for non-standard projections
        return Math.pow(2, this._getZoomForUrl());
    },
    
    _adjustTilePoint: function (tilePoint) {
        var limit = this._getWrapTileNum();

        /*
        // wrap tile coordinates
        if (!this.options.continuousWorld && !this.options.noWrap) {
            tilePoint.x = ((tilePoint.x % limit) + limit) % limit;
        }

        if (this.options.tms) {
            tilePoint.y = limit - tilePoint.y - 1;
        }
        */
        tilePoint.z = this._getZoomForUrl();
    }
})
