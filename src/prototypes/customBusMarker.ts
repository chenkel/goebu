"use strict";

function CustomBusMarker(latlng, map, args) {
    this.latlng = latlng;
    this.args = args;
    this.setMap(map);
    this.route_id = ' ';
    this.stalled = false;
}

CustomBusMarker.prototype = new google.maps.OverlayView();

CustomBusMarker.prototype.draw = function () {

    var self = this;

    var div = this.div;

    this.divHeight = 10;
    this.divWidth = 40;

    if (!div) {

        div = this.div = document.createElement('div');

        div.className = 'bus-marker';

        div.style.position = 'absolute';
        div.style.cursor = 'pointer';
        div.style.width = this.divWidth + 'px';
        div.style.height = this.divHeight + 'px';
        //div.style.background = 'blue';

        if (typeof(this.args.route_id) !== 'undefined' && typeof(this.args.stalled) !== 'undefined') {
            this.setRouteIdAndIsStalled(this.args.route_id, this.args.stalled);
        }

        google.maps.event.addDomListener(div, "click", function (event) {
            console.log(event, "<-- busMarker click event");
            google.maps.event.trigger(self, "click");
        });

        var panes = this.getPanes();
        panes.overlayImage.appendChild(div);
    }

    var point = this.getProjection().fromLatLngToDivPixel(this.latlng);

    if (point) {
        div.style.left = (point.x - Math.floor(this.divWidth / 2)) + 'px';
        div.style.top = (point.y - this.divHeight) + 'px';
    }
};

CustomBusMarker.prototype.remove = function () {
    if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
    }
};

CustomBusMarker.prototype.getPosition = function () {
    return this.latlng;
};

CustomBusMarker.prototype.setPosition = function (latlng) {
    this.latlng = latlng;
    if (this.div) {
        var point = this.getProjection().fromLatLngToDivPixel(this.latlng);

        if (point) {
            this.div.style.left = (point.x - Math.floor(this.divWidth / 2)) + 'px';
            this.div.style.top = (point.y - this.divHeight) + 'px';
        }
    }
};

CustomBusMarker.prototype.setRouteIdAndIsStalled = function (route_id, isStalled) {
    var innerHTMLclass = '';
    if (this.div && route_id) {
        if (isStalled) {
            this.route_id = route_id;
            this.stalled = true;
            innerHTMLclass = "badge line-badge line-stalled";
            this.div.innerHTML = '<span class="' + innerHTMLclass + '">' + route_id + '</span>';
        }
        if (!isStalled && this.route_id !== route_id) {
            this.stalled = false;
            this.route_id = route_id;
            innerHTMLclass = "badge line-badge line-" + route_id;
            this.div.innerHTML = '<span class="' + innerHTMLclass + '">' + route_id + '</span>';
        }
    } else {
        //console.log(this.div, route_id, "<-- this.div, route_id");
    }

};
