// Определение локации по IP (если нет координат)
async function geoByIP() {
    try {
        const resp = await fetch('https://ip-api.io/json');
        if (!resp.ok) throw new Error("Нет ответа ip-api");
        const data = await resp.json();
        return {
            city: data.city || "Ваш город",
            country: data.country_name || "Ваша страна"
        };
    } catch (e) {
        // fallback, если API не отвечает
        return {
            city: "Мир",
            country: "Мир"
        };
    }
}

window.GeoNews = {
    getLocation: async function() {
        // Пытаемся получить координаты браузера, если разрешено
        return new Promise(resolve => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    // Получаем данные через Геокодинг (например, через Nominatim)
                    const {latitude, longitude} = pos.coords;
                    try {
                        const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                        const geoResp = await fetch(url);
                        const geoData = await geoResp.json();
                        resolve({
                            city: geoData.address.city || geoData.address.town || geoData.address.village || "Ваш город",
                            country: geoData.address.country || "Ваша страна"
                        });
                    } catch(e) {
                        // Если ошибка — пробуем по IP
                        const byIP = await geoByIP();
                        resolve(byIP);
                    }
                }, async _ => {
                    // Отказ — по IP
                    const byIP = await geoByIP();
                    resolve(byIP);
                });
            } else {
                // Если геолокация не поддерживается, fallback
                geoByIP().then(resolve);
            }
        });
    }
};