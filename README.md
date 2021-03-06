# gisfile.json.js
L.GisFileJson turns json box data into a Leaflet layer

<p>
This is the Gisfile Javascript API, version 1.x. It's built as a <a href="http://leafletjs.com/">Leaflet</a>
plugin. You can <a href="http://gisfile.com/api/1.0/doc/box/">read more about the Gisfile API</a>
</p>

<h2>
<a id="user-content-exampls" class="anchor" href="#exampls" aria-hidden="true">
Examples
</h2>

<ul>
<li><a href="http://gisfile.com/layer/SPcities/tile?json&fs=1">json box data</a></li>
<li><a href="http://gisfile.com/layer/SpatialTown/tile?zip&lat=50.43&lon=30.67&z=9">zip (packed json) box data</a></li>
</ul>

<h2>
<a id="user-content-api" class="anchor" href="#api" aria-hidden="true">
<span class="octicon octicon-link"></span></a>
<a href="http://gisfile.com/js/gisfile.json.js">API</a>
</h2>

<p>Latest version of the GISfile JavaScript API in the <code>src</code> directory</p>

<h2>
<a id="user-content-examples" class="anchor" href="#examples" aria-hidden="true">
<span class="octicon octicon-link"></span></a>
<a href="http://gisfile.com/api/1.0/doc/box/">Usage</a>
</h2>

<p>One way of usage is via the Gisfile CDN:</p>

<div class="highlight highlight-html">
<pre>
&lt;script src='http://gisfile.com/js/gisfile.json.js'&gt;&lt;/script&gt;
</pre>
</div>

<p>If we are going to use zip files you sloud add jszip.min.js script:</p>

<div class="highlight highlight-html">
<pre>
&lt;script src='http://gisfile.com/js/gisfile.json.js'&gt;&lt;/script&gt;
&lt;script src='http://gisfile.com/js/jszip.min.js'&gt;&lt;/script&gt;
</pre>
</div>

<p>The <code>gisfile.json.js</code> file does not includes the Leaflet and jsZip library. 
You will have to include the Leaflet and jsZip yourself.</p>

<div class="highlight highlight-html">
<pre>
&lt;html&gt;
    &lt;head&gt;
        &lt;script src="http://gisfile.com/js/jquery/jquery-1.8.0.min.js"&gt;&lt;/script&gt;
        &lt;link rel="stylesheet" href="http://gisfile.com/css/leaflet.css" /&gt;
        &lt;script src="http://gisfile.com/js/leaflet.js"&gt;&lt;/script&gt;
        &lt;script src="http://gisfile.com/js/gisfile.json.js"&gt;&lt;/script&gt;
        &lt;script src="http://gisfile.com/js/jszip.min.js"&gt;&lt;/script&gt;
    &lt;/head&gt;
    &lt;body&gt;
        &lt;div id="map" style="width: 100%; height: 500px"&gt;&lt;/div&gt;

        &lt;script type="text/javascript"&gt;
            var map = new L.map("map", {
                    center: [50.43146, 30.99928], 
                    zoom: 16
                });

            if (map) {
                var osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
                map.addLayer( osm);
                    new L.GisFileJson({ layer : 'kipai'
                        , url: 'http://gisfile.com/layer/{l}/{z}/{x}/{y}.zip'
                        , minSize: 5
                        , onActiveFeature: function (feature, layer) {
                            if (feature.properties && feature.properties.name && feature.properties.name.length &gt; 0)
                                layer.bindPopup( feature.properties.name);
                        }
                        , style: function(feature) {
                            return {weight: 1, fillOpacity: 0.1, color: '#FA0000', fillColor: '#FA0000'};
                        }
                    }).addTo(map);
            }
        &lt;/script&gt;
    &lt;/body&gt;
&lt;/html&gt;
</pre>
</div>

<h2>
<a id="user-content-references" class="anchor" href="#references" aria-hidden="true">
<span class="octicon octicon-link"></span></a>
<a href="http://gisfile.com/api/1.0/doc/box/">References</a>
</h2>

<p>
<a href="http://gisfile.com/api/1.0/doc/">Description</a><br>
<a href="http://gisfile.com/api/1.0/doc/quick-start/">First Start</a><br>
<a href="http://gisfile.com/api/1.0/doc/general/">General Information</a><br>
<a href="http://gisfile.com/api/1.0/doc/jsapi/">Connecting API</a><br>
<a href="http://gisfile.com/api/1.0/doc/jsonp/">Dynamic JSONP Layer</a><br>
<a href="http://gisfile.com/api/1.0/doc/box/">Box Layer</a><br>
<a href="http://gisfile.com/designer.htm">Map Designer</a>
</p>
