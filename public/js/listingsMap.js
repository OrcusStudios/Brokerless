let map, drawingManager, selectedPolygon = null; 
let markers = [];

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 38.573936, lng: -92.603760 }, // Central Missouri
        zoom: 8,
        mapId: "64697088a5f523d3"
    });

    // Initialize Drawing Manager for Polygon Selection
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingControl: true,
        polygonOptions: { fillColor: "#FF0000", fillOpacity: 0.35 }
    });

    drawingManager.setMap(map);
    google.maps.event.addListener(drawingManager, "overlaycomplete", function(event) {
        if (selectedPolygon) selectedPolygon.setMap(null);
        selectedPolygon = event.overlay;
        document.getElementById("clearPolygon").style.display = "block";
    });

    document.getElementById("clearPolygon").addEventListener("click", function() {
        if (selectedPolygon) selectedPolygon.setMap(null);
        selectedPolygon = null;
        document.getElementById("clearPolygon").style.display = "none";
    });

    // Create markers for each listing
    if (window.mapData) {
        window.mapData.forEach(listing => {
            if (listing.lat && listing.lng) {
                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: { lat: listing.lat, lng: listing.lng },
                    map: map,
                    title: listing.address
                });
                
                // Create info window content
                const content = '<div style="max-width: 250px;">' +
                    '<h6>' + listing.address + '</h6>' +
                    '<p><strong>Price:</strong> $' + listing.price.toLocaleString() + '</p>' +
                    '<p><strong>Beds:</strong> ' + listing.bedrooms + ' | <strong>Baths:</strong> ' + listing.bathrooms + '</p>' +
                    '<a href="/listings/' + listing._id + '" class="btn btn-sm btn-primary">View Details</a>' +
                    '</div>';
                
                const infoWindow = new google.maps.InfoWindow({
                    content: content
                });

                marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });
                markers.push(marker);
            }
        });
    }
}

// Filtering & Map Update Script
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById("filterForm").addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent page reload
        fetchFilteredListings();
    });
});

// Function to fetch filtered listings & update the page
function fetchFilteredListings(polygonCoords = null) {
    const location = document.getElementById("location").value;
    const minPrice = document.getElementById("minPrice").value;
    const maxPrice = document.getElementById("maxPrice").value;
    const bedrooms = document.getElementById("bedrooms").value;
    const bathrooms = document.getElementById("bathrooms").value;
    const sort = document.getElementById("sort").value;
    const body = JSON.stringify({
        location,
        minPrice,
        maxPrice,
        bedrooms,
        bathrooms,
        sort,
        polygon: polygonCoords
    });

    fetch(`/filter`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: body
    })
    .then(response => response.json())
    .then(data => {
        updateListingsOnPage(data);  // Update the left-side listings
        updateMapMarkers(data);      // Update the map markers
    })
    .catch(error => console.error("Error loading filtered listings:", error));
}

// Updates Sidebar Listings
function updateListingsOnPage(listings) {
    const listingsContainer = document.getElementById("listingsContainer");
    listingsContainer.innerHTML = ""; // Clear old listings

    listings.forEach(listing => {
        const listingHtml = `
            <div class="card mb-2">
                <div class="row g-0">
                    <div class="col-md-4">
                        <img src="${listing.image || '/images/default-home.jpg'}" class="img-fluid rounded-start" alt="Listing Image">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <h6 class="card-title">${listing.address}, ${listing.city}</h6>
                            <p class="card-text"><strong>Beds:</strong> ${listing.bedrooms} | <strong>Baths:</strong> ${listing.bathrooms}</p>
                            <p class="card-text"><strong>Price:</strong> $${listing.price.toLocaleString()}</p>
                            <a href="/listings/${listing._id}" class="btn btn-sm btn-info">View Details</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        listingsContainer.innerHTML += listingHtml;
    });
}

// Function to update markers on the map after filtering
function updateMapMarkers(listings) {
    if (!map) return;

    markers.forEach(marker => {
        marker.map = null;
    });
    markers.length = 0;
    
    // If no listings exist, exit
    if (listings.length === 0) {
        return;
    }

    // ADD NEW MARKERS using AdvancedMarkerElement
    listings.forEach(listing => {
        if (listing.lat && listing.lng) {
            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: { lat: listing.lat, lng: listing.lng },
                map: map,
                title: listing.address
            });

            const content = '<div style="max-width: 250px;">' +
                '<h6>' + listing.address + '</h6>' +
                '<img src="' + (listing.image || '/images/default-home.jpg') + '" class="img-fluid rounded-start" alt="Listing Image">' +
                '<p><strong>Price:</strong> $' + listing.price.toLocaleString() + '</p>' +
                '<p><strong>Beds:</strong> ' + listing.bedrooms + ' | <strong>Baths:</strong> ' + listing.bathrooms + '</p>' +
                '<a href="/listings/' + listing._id + '" class="btn btn-sm btn-primary">View Details</a>' +
                '</div>';

            const infoWindow = new google.maps.InfoWindow({
                content: content
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });
            markers.push(marker);
        }
    });
}

// Gallery functionality
function openGallery(listingId) {
    if (!window.listingsData) return;
    
    const listing = window.listingsData.find(l => l._id === listingId);
    if (!listing || !listing.image) {
        alert("No images available for this listing.");
        return;
    }

    const carouselImages = document.getElementById("carouselImages");
    carouselImages.innerHTML = "";

    if (listing.images && listing.images.length > 0) {
        listing.images.forEach((image, index) => {
            const activeClass = index === 0 ? "active" : "";
            carouselImages.innerHTML += `
                <div class="carousel-item ${activeClass}">
                    <img src="${image}" class="d-block w-100 img-fluid" alt="Listing Image">
                </div>
            `;
        });

        const modal = new bootstrap.Modal(document.getElementById("imageGalleryModal"));
        modal.show();
    } else {
        alert("No additional images available for this listing.");
    }
}
