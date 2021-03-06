(function() {
	var Metadog = (function() {

		function isEmpty(obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop))
					return false;
			}
			return true;
		}

		var Metadog = function(options) {
			//options takes in a document tree
			this._document = options;
			this._metadata = {};
			this._metadata.schema = [];
			this._metadata.extra = {};
			this._metadata.extra.errors = [];
		};

		Metadog.prototype.scrape = function scrape() {
			this._fetchOpenGraph();
			this._fetchSchema();
			this._mapToModel();
			return this._metadata;
		};

		Metadog.prototype._checkCanonical = function() {
			var link = this._document.querySelector('link[rel="canonical"]');
			if (link)
				return link.href;
			else
				return false;
		};

		Metadog.prototype._fetchOpenGraph = function() {
			var tags = this._document.querySelectorAll('[property*="og:"]');
			this._openGraphData = {};
			for (var i = 0; i < tags.length; i++) {
				this._openGraphData[tags[i].getAttribute('property')] = tags[i].content;
			}
		};

		Metadog.prototype._fetchSchema = function() {
			function setProps(set) {
				for (var i = 0; i < set.length; i++) {
					var itemprop = set[i].getAttribute('itemprop');
					if (this._schemaData[itemprop]){
						itemprop = set[i].getAttribute('itemprop') + i;
					}
					if (set[i].getAttribute('content')) {
						this._schemaData[itemprop] = set[i].getAttribute('content');
					} else if (set[i].getAttribute('href') || set[i].getAttribute('src')) {

						this._schemaData[itemprop] = set[i].href? set[i].href: set[i].src;
					} else {
						this._schemaData[itemprop] = set[i].textContent;
					}
				}
			}
			var itemprops = this._document.querySelectorAll('[itemprop]');
			setProps.apply(this, itemprops);
		};

		Metadog.prototype._mapToModel = function() {

			function setParam(ogParam, schemaParam, metaParam, optional) {
				if (!optional) {
					if (opengraph && this._openGraphData[ogParam]) {
						this._metadata[metaParam] = this._openGraphData[ogParam];
					} else if (schema && this._schemaData[schemaParam]) {
							this._metadata[metaParam] = this._schemaData[schemaParam];
					} else {
						this._metadata.extra.errors.push(metaParam + ' not found');
					}
				} else {
					if (opengraph && this._openGraphData[ogParam]) {
						this._metadata.extra[metaParam] = this._openGraphData[ogParam];
					} else if (schema && this._schemaData[schemaParam]) {
						this._metadata.extra[metaParam] = this._schemaData[schemaParam];
					} else {
						this._metadata.extra.errors.push(metaParam + ' not found');
					}
				}
			}

			var opengraph = false;
			var schema = false;

			if (!isEmpty(this._openGraphData)) {
				this._metadata.schema.push(0);
				opengraph = true;
			}

			if (!isEmpty(this._schemaData)) {
				this._metadata.schema.push(1);
				schema = true;
			}

			if (this._checkCanonical() ){
				this._metadata.url = this._checkCanonical();
			} else if (opengraph) {
				this._metadata.url = this._openGraphData['og:url'];
			} else if (schema) {
				this._metadata.url = this._schemaData.url;
			} else {
				this._metadata.extra.errors.push('url not found');
			}

			//get base parameters
			setParam.apply(this, ['og:title', 'name', 'name']);
			setParam.apply(this, ['og:description', 'description', 'description']);
			setParam.apply(this, ['og:image', 'image', 'image']);
			setParam.apply(this, ['og:type', 'type', 'type']);

			//get extra parameters
			setParam.apply(this, ['og:price', 'price', 'price', true]);
			setParam.apply(this, ['og:priceCurrency', 'priceCurrency', 'priceCurrency', true]);
			setParam.apply(this, ['og:availability', 'availability', 'availability', true]);
		};

		Metadog.prototype._deepCompare = function(proposed, current) {
			//TODO: currently checks against values directly. Need to implement check for Array types and Object types
			//Objects will have the same method called on them recursively
			function isEqual(arr1, arr2) {
				if(arr1.length !== arr2.length)
					return false;
				arr1.sort();
				arr2.sort();
				for(var j = 0; j < arr1.length; j++) {
					if(arr2[j].constructor === Array) {
						isEqual(arr1[j], arr2[j]);
					} else if(arr2.indexOf(arr1[j]) < 0) {
						return false;
					}
				}
				return true;
			}
			var proposedProps = Object.getOwnPropertyNames(proposed);
			var currentProps = Object.getOwnPropertyNames(current);

			if (proposedProps.length !== currentProps.length)
				return false;

			for(var i = 0; i < proposedProps.length; i++) {
				var ignored = ['created', 'updated', 'ip', 'brand'];
				var propToCheck = proposedProps[i];
				//skips over ignored properties
				if (ignored.indexOf(propToCheck) > 0 ) {
					continue;
				}
				var prop1 = proposed[propToCheck];
				var prop2 = current[propToCheck];
				if(prop1.constructor === Array) {
					if (!isEqual(prop1, prop2))
						return false;
				} else if (typeof prop1 === "object") {
					if (this._deepCompare(prop1, prop2)){
						continue;
					} else {
						return false;
					}
				} else if(prop1 !== prop2) {
					return false;
				}
			}
			return true;
		};

		return Metadog;

	})();

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		// Check for Node.js
		module.exports = Metadog;
	} else {
		//  For AMD Support.
		if (typeof define === 'function' && define.amd) {
			define([], function() {

				return Metadog;
			});
		} else {

			// Export to the window scope, for Browser Support.
			window.Metadog = Metadog;
		}
	}
})();
