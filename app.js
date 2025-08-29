class EnhancedWeatherApp {
    constructor() {
        this.API_KEY = '087a597dbc53c15de50c6a2a7806a1f6';
        this.BASE_URL = 'https://api.openweathermap.org/data/2.5';
        this.GEO_URL = 'https://api.openweathermap.org/geo/1.0';

        this.currentUnit = 'celsius';
        this.currentWeatherData = null;
        this.userLocation = null;
        this.favorites = JSON.parse(localStorage.getItem('weatherFavorites') || '[]');

        this.lastRequestTime = 0;
        this.REQUEST_DELAY = 1000; 

        this.weatherIcons = {
            '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
            '09d': '🌦️', '09n': '🌦️', '10d': '🌧️', '10n': '🌧️',
            '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️', 'default': '🌤️'
        };
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }

    setupApp() {
        console.log('🌤️ Enhanced Weather App starting up...');
        console.log('✅ API key configured successfully');

        this.cacheElements();
        this.bindEvents();
        this.requestLocationPermission();
        console.log('✅ Enhanced Weather app initialized successfully');
    }

    cacheElements() {
        this.cityInput = document.getElementById('city-input');
        this.searchBtn = document.getElementById('search-btn');
        this.tempToggle = document.getElementById('temp-toggle');
        this.locationBtn = document.getElementById('location-btn');
        this.loadingState = document.getElementById('loading-state');
        this.weatherContent = document.getElementById('weather-content');
        this.cityName = document.getElementById('city-name');
        this.weatherIcon = document.getElementById('weather-icon');
        this.temperature = document.getElementById('temperature');
        this.weatherDesc = document.getElementById('weather-desc');
        this.humidity = document.getElementById('humidity');
        this.windSpeed = document.getElementById('wind-speed');
        this.pressure = document.getElementById('pressure');
        this.visibility = document.getElementById('visibility');
        this.feelsLike = document.getElementById('feels-like');
        this.uvIndex = document.getElementById('uv-index');
        this.errorMessage = document.getElementById('error-message');
        this.errorDescription = document.getElementById('error-description');

        if (!this.cityInput || !this.searchBtn || !this.tempToggle) {
            console.error('❌ Required elements not found');
            this.showError('App initialization failed - check HTML structure');
            return false;
        }
        return true;
    }

    bindEvents() {
        this.searchBtn.onclick = (e) => {
            e.preventDefault();
            this.handleSearch();
        };

        this.cityInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleSearch();
            }
        };

        this.tempToggle.onclick = (e) => {
            e.preventDefault();
            this.toggleTemperatureUnit();
        };

        if (this.locationBtn) {
            this.locationBtn.onclick = (e) => {
                e.preventDefault();
                this.getCurrentLocationWeather();
            };
        }

        this.cityInput.onfocus = () => {
            this.hideError();
        };

        this.cityInput.oninput = (e) => {
            this.handleInputSuggestions(e.target.value);
        };

        console.log('✅ Event listeners bound successfully');
    }

    async requestLocationPermission() {
        if (navigator.geolocation) {
            try {
                const position = await this.getCurrentPosition();
                this.userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                console.log('📍 Location detected:', this.userLocation);
                await this.getWeatherByCoordinates(this.userLocation.lat, this.userLocation.lon);
            } catch (error) {
                console.log('📍 Location access denied or unavailable, loading London as default');
                this.getWeatherByCity('London');
            }
        } else {
            console.log('📍 Geolocation not supported, loading London as default');
            this.getWeatherByCity('London');
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 
            });
        });
    }

    async handleSearch() {
        const cityName = this.cityInput.value.trim();

        if (!cityName) {
            this.showError('Please enter a city name');
            return;
        }

        const now = Date.now();
        if (now - this.lastRequestTime < this.REQUEST_DELAY) {
            this.showError('Please wait a moment before making another request');
            return;
        }

        this.lastRequestTime = now;
        await this.getWeatherByCity(cityName);
        this.cityInput.value = '';
    }

    async getWeatherByCity(cityName) {
        try {
            this.showLoading();
            console.log(`🔍 Searching weather for: ${cityName}`);

            const geoData = await this.geocodeCity(cityName);
            if (!geoData || geoData.length === 0) {
                throw new Error(`City "${cityName}" not found. Please check spelling and try again.`);
            }

            const { lat, lon, name, country } = geoData[0];
            console.log(`✅ Found location: ${name}, ${country} (${lat}, ${lon})`);

            await this.getWeatherByCoordinates(lat, lon, `${name}, ${country}`);

        } catch (error) {
            this.hideLoading();
            console.error('❌ Weather fetch error:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        }
    }

    async geocodeCity(cityName) {
        const url = `${this.GEO_URL}/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${this.API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
            }
            throw new Error(`Geocoding failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async getWeatherByCoordinates(lat, lon, locationName = null) {
        try {
            this.showLoading();
            console.log(`🌤️ Fetching weather data for coordinates: ${lat}, ${lon}`);

            const weatherData = await this.fetchCurrentWeather(lat, lon);

            const airData = await this.fetchAirQuality(lat, lon).catch(() => null);

            const combinedData = {
                ...weatherData,
                air: airData,
                displayName: locationName || `${weatherData.name}, ${weatherData.sys.country}`
            };

            this.currentWeatherData = combinedData;
            this.displayWeather(combinedData);
            console.log('✅ Weather data loaded successfully');

        } catch (error) {
            this.hideLoading();
            console.error('❌ Weather fetch error:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        }
    }

    async fetchCurrentWeather(lat, lon) {
        const units = this.currentUnit === 'celsius' ? 'metric' : 'imperial';
        const url = `${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=${units}`;

        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key. Please verify your OpenWeatherMap API key.');
            } else if (response.status === 429) {
                throw new Error('API rate limit exceeded. Please wait a moment and try again.');
            }

            const errorData = await response.json().catch(() => null);
            const errorMessage = errorData?.message || `Weather API error: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return await response.json();
    }

    async fetchAirQuality(lat, lon) {
        const url = `${this.BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${this.API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Air quality data unavailable');
        }

        return await response.json();
    }

    displayWeather(data) {
        this.hideLoading();
        this.hideError();

        try {
            this.cityName.textContent = data.displayName || `${data.name}, ${data.sys.country}`;
            this.weatherIcon.textContent = this.weatherIcons[data.weather[0].icon] || this.weatherIcons.default;
            this.updateTemperatureDisplay(data.main.temp);
            this.weatherDesc.textContent = this.capitalizeFirst(data.weather[0].description);

            this.humidity.textContent = `${data.main.humidity}%`;
            this.windSpeed.textContent = `${Math.round(data.wind?.speed || 0)} ${this.getWindSpeedUnit()}`;

            if (this.pressure) {
                this.pressure.textContent = `${data.main.pressure} hPa`;
            }

            if (this.visibility) {
                const visibilityKm = data.visibility ? Math.round(data.visibility / 1000) : 'N/A';
                this.visibility.textContent = `${visibilityKm} km`;
            }

            if (this.feelsLike) {
                const feelsLikeTemp = this.convertTemperature(data.main.feels_like);
                const unit = this.currentUnit === 'celsius' ? '°C' : '°F';
                this.feelsLike.textContent = `${Math.round(feelsLikeTemp)}${unit}`;
            }

            if (data.air) {
                this.displayAirQuality(data.air);
            }

            this.weatherContent.classList.remove('hidden');

            console.log('✅ Weather displayed for:', data.displayName || data.name);

        } catch (error) {
            console.error('❌ Display error:', error);
            this.showError('Error displaying weather data');
        }
    }

    displayAirQuality(airData) {
        if (!airData || !airData.list || airData.list.length === 0) return;

        const aqi = airData.list[0].main.aqi;
        const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
        const aqiLabel = aqiLabels[aqi] || 'Unknown';

        let aqiElement = document.getElementById('air-quality');
        if (aqiElement) {
            aqiElement.textContent = aqiLabel;
        }
    }

    updateTemperatureDisplay(tempValue) {
        const convertedTemp = this.convertTemperature(tempValue);
        const unit = this.currentUnit === 'celsius' ? '°C' : '°F';
        this.temperature.textContent = `${Math.round(convertedTemp)}${unit}`;
    }

    convertTemperature(tempValue) {
        return tempValue;
    }

    getWindSpeedUnit() {
        return this.currentUnit === 'celsius' ? 'm/s' : 'mph';
    }

    async toggleTemperatureUnit() {
        const previousUnit = this.currentUnit;

        if (this.currentUnit === 'celsius') {
            this.currentUnit = 'fahrenheit';
            this.tempToggle.textContent = '°C';
        } else {
            this.currentUnit = 'celsius';
            this.tempToggle.textContent = '°F';
        }

        console.log(`🔄 Temperature unit changed to: ${this.currentUnit}`);

        if (this.currentWeatherData) {
            const { coord } = this.currentWeatherData;
            if (coord) {
                try {
                    await this.getWeatherByCoordinates(coord.lat, coord.lon, this.currentWeatherData.displayName);
                } catch (error) {
                    console.error('❌ Error refreshing weather data:', error);
                    this.currentUnit = previousUnit; 
                    this.tempToggle.textContent = previousUnit === 'celsius' ? '°F' : '°C';
                }
            }
        }
    }

    async getCurrentLocationWeather() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        try {
            this.showLoading();
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            await this.getWeatherByCoordinates(latitude, longitude);

        } catch (error) {
            this.hideLoading();
            if (error.code === 1) {
                this.showError('Location access denied. Please allow location access and try again.');
            } else if (error.code === 2) {
                this.showError('Location information is unavailable.');
            } else if (error.code === 3) {
                this.showError('Location request timed out.');
            } else {
                this.showError('Error getting your location: ' + error.message);
            }
        }
    }

    handleInputSuggestions(input) {
        if (input.length < 3) return;
    }

    capitalizeFirst(str) {
        return str.replace(/\b\w/g, l => l.toUpperCase());
    }

    showLoading() {
        this.loadingState.classList.remove('hidden');
        this.weatherContent.classList.add('hidden');
        this.searchBtn.disabled = true;
        this.searchBtn.textContent = 'Searching...';
        this.hideError();
    }

    hideLoading() {
        this.loadingState.classList.add('hidden');
        this.searchBtn.disabled = false;
        this.searchBtn.textContent = 'Search';
    }

    showError(message) {
        this.errorDescription.textContent = message;
        this.errorMessage.classList.remove('hidden');

        setTimeout(() => this.hideError(), 7000);
    }

    hideError() {
        this.errorMessage.classList.add('hidden');
    }

    async getForecast(lat, lon) {
        try {
            const units = this.currentUnit === 'celsius' ? 'metric' : 'imperial';
            const url = `${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${this.API_KEY}&units=${units}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Forecast data unavailable');
            }

            return await response.json();

        } catch (error) {
            console.error('Forecast fetch error:', error);
            return null;
        }
    }
}

const weatherApp = new EnhancedWeatherApp();
weatherApp.init();
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('city-input')?.focus();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        weatherApp.getCurrentLocationWeather();
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('✅ SW registered:', registration))
            .catch(error => console.log('❌ SW registration failed:', error));
    });
}

console.log('🌤️ Enhanced Weather App Script Loaded - Ready with your API key!');
console.log('🚀 Try searching for cities or allow location access for automatic weather!');
