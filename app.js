// Элемент для вывода новостей
const cityEl = document.getElementById("city");
const countryEl = document.getElementById("country");
const newsList = document.getElementById("news-list");

const datePicker = document.getElementById("date-picker");
const today = new Date().toISOString().slice(0, 10);
datePicker.max = today;
datePicker.value = today;

// Популярные источники — примерная интеграция с NewsAPI или другим API (требуется ключ)
const apiSources = [
    {
        id: "newsapi",
        url: (city, country, date) =>
            `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&from=${date}&sortBy=publishedAt&apiKey=YOUR_API_KEY`,
        extract: resp =>
            resp.articles?.map(a => ({
                title: a.title,
                link: a.url,
                source: a.source.name,
                publishedAt: a.publishedAt
            })) || []
    }
];
// Если хотите отображать главные новости — еще один эндпоинт по стране:
const topHeadlinesURL = (country, date) =>
    `https://newsapi.org/v2/top-headlines?country=${encodeURIComponent(country)}&from=${date}&apiKey=YOUR_API_KEY`;

// Подгрузка из JSON, если API не работает
async function fetchFallbackNews(city, country, date) {
    try {
        const resp = await fetch('News.json');
        const data = await resp.json();
        // Ищем новости по городу/стране/дате
        let res = data.articles.filter(news =>
            (news.city === city || news.country === country || news.category === "world") &&
            (!date || news.date === date)
        );
        // fallback — показываем мировые, если ничего не найдено
        if (!res.length) {
            res = data.articles.filter(news => news.category === "world");
        }
        return res.map(a => ({
            title: a.title,
            link: a.url,
            source: a.source || "GeoNews (локально)",
            publishedAt: a.date
        }));
    } catch (e) {
        return [{
            title: "Нет доступа к новостям",
            link: "#",
            source: "GeoNews",
            publishedAt: ""
        }];
    }
}

async function fetchNews(city, country, date) {
    // Реализуйте свою логику подключения к внешним API (NewsAPI требует свой API key!)
    try {
        // Пример: поиск по первому источнику
        // const resp = await fetch(apiSources[0].url(city, country, date));
        // const data = await resp.json();
        // let news = apiSources[0].extract(data);
        // if (news.length) return news;

        // Временно всегда fallback
        return await fetchFallbackNews(city, country, date);
    } catch (e) {
        return fetchFallbackNews(city, country, date);
    }
}

function renderNews(newsArr) {
    newsList.innerHTML = "";
    if (!newsArr.length) {
        newsList.innerHTML = '<div class="loading">Нет новостей для выбранных параметров.</div>';
        return;
    }
    newsArr.forEach(news => {
        const div = document.createElement('div');
        div.className = "news-card";
        div.innerHTML = `
            <div class="news-title">${news.title}</div>
            <div class="news-meta">${news.source}${news.publishedAt ? ', ' + (new Date(news.publishedAt).toLocaleDateString()) : ''}</div>
            <a target="_blank" rel="noopener" class="news-link" href="${news.link}">Читать</a>
        `;
        newsList.appendChild(div);
    });
}

async function showNewsByLocation(date) {
    newsList.innerHTML = '<div class="loading">Загрузка новостей...</div>';
    const {city, country} = await window.GeoNews.getLocation();
    cityEl.textContent = city;
    countryEl.textContent = country;
    const newsArr = await fetchNews(city, country, date);
    renderNews(newsArr);
}

datePicker.addEventListener('change', (e) => {
    showNewsByLocation(e.target.value);
});

// init загрузка при старте
showNewsByLocation(today);