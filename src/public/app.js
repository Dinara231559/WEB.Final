const map = L.map('map');


document.getElementById('search-btn').addEventListener('click', async () => {
    const city = document.getElementById('city-input').value.trim();
    if (!city) {
        alert('Please enter a city name!');
        return;
    }

    try {
        const response = await fetch(`/api/weather?city=${city}`);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }


        document.querySelector('.temp').textContent = `${data.weather.temperature}°C`;
        document.querySelector('.city').textContent = city;
        document.querySelector('.humidity').textContent = `Humidity: ${data.weather.humidity}%`;
        document.querySelector('.wind').textContent = `Wind: ${data.weather.wind_speed} km/h`;
        document.querySelector('.pressure').textContent = `Pressure: ${data.weather.pressure} hPa`;
        document.querySelector('.feels-like').textContent = `Feels Like: ${data.weather.feels_like}°C`;
        document.querySelector('.description').textContent = data.weather.description;
        document.querySelector('.coordinates').textContent = `Coordinates: (${data.weather.coordinates.lat}, ${data.weather.coordinates.lon})`;
        document.querySelector('.country-code').textContent = `Country Code: ${data.weather.country}`;
        document.querySelector('.flag-image').src = data.flag.url;
        document.querySelector('.country-name').textContent = `Country: ${data.flag.country}`;
        
        const weatherIcon = document.querySelector('.weather-icon');
        weatherIcon.src = data.weather.icon;
        weatherIcon.style.display = 'block';

        document.getElementById('map').style.display = 'block';
        const latLon = [data.weather.coordinates.lat, data.weather.coordinates.lon];
        map.setView(latLon, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const marker = L.marker(latLon).addTo(map);
        marker.bindPopup(`<b>${city}</b><br>${data.weather.description}`).openPopup();

        const newsContainer = document.querySelector('.news-container');
        newsContainer.innerHTML = ''; 
        data.news.forEach(article => {
            const articleElement = document.createElement('div');
            articleElement.classList.add('news-article');
        
            const articleTitle = document.createElement('h3');
            articleTitle.textContent = article.title;
        
            const articleDescription = document.createElement('p');
            articleDescription.textContent = article.description;
        
            articleElement.appendChild(articleTitle);
            articleElement.appendChild(articleDescription);
        
            newsContainer.appendChild(articleElement);
        });
        
        const flagImage = document.querySelector('.flag-image');
        const countryName = document.querySelector('.country-name');
        
        if (flagImage && countryName && data.flag && data.flag.url) {
            flagImage.src = data.flag.url;
            flagImage.style.display = 'block';
            
            countryName.textContent = `Country: ${data.flag.country}`;
            countryName.style.display = 'block'; 
        } else {
            console.error("Flag data missing or incorrect:", data.flag);
        }
        
        

    } catch (error) {
        console.error('Error fetching weather or news data:', error);
        alert('Failed to fetch weather or news data.');
    }

    
});
