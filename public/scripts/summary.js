// ボタンなどの変数
const pinBtn = document.getElementById("pinBtn");
const polygonBtn = document.getElementById("polygonBtn");
const toggleContainer = document.getElementById("toggleContainer");
const reportBtn = document.getElementById("reportBtn");
const addressDisplay = document.getElementById("currentAddress");

const reportFromGPSBtn = document.getElementById("reportFromGPS");
const reportFromManualBtn = document.getElementById("reportFromManual");
const openFormBtn = document.getElementById("openFormBtn");

// URL パラメータから district と name を取得
const params = new URLSearchParams(window.location.search);
const district = params.get("district");
const name = params.get("name");

// === グローバル状態 ===
let polygonLayers = []; // 全てのポリゴンを保持
let currentMode = "pins"; // polygon または pins
let reportMarkerLayer = L.layerGroup(); // 報告ピンレイヤー
let isWaiting = false;

let map
let manualPinLatLng = null; // ユーザーがクリックで立てたピンの位置
let gpsLatLng = null;       // 現在地ボタンで取得した位置
let reportLatLng = null;

let polygonOtherLayers = [];    // ピン表示モード用
let polygonProgressLayers = []; // 状況表示モード用
let pinPolygonsLoaded = false;
let globalTownData = null; // 
let isManualReportingMode = false;

// 画面表示切り替え
function switchDisplayMode(mode) {
  console.log("モード切り替え:", mode);

  if (mode === "pins") {
    currentMode = "pins";

    // 状況用ポリゴンを非表示
    polygonProgressLayers.forEach(layer => map.removeLayer(layer));
    // ピン用ポリゴンを表示（必要があれば）
    polygonOtherLayers.forEach(layer => layer.addTo(map));

    // ピンレイヤー表示
    if (!map.hasLayer(reportMarkerLayer)) map.addLayer(reportMarkerLayer);

    pinBtn.classList.add("active");
    polygonBtn.classList.remove("active");
    toggleContainer.classList.remove("mode-right");
    toggleContainer.classList.add("mode-left");

  } else {
    currentMode = "polygon";

    // ピン用ポリゴンを非表示
    polygonOtherLayers.forEach(layer => map.removeLayer(layer));
    // 状況用ポリゴンを表示
    polygonProgressLayers.forEach(layer => layer.addTo(map));

    map.removeLayer(reportMarkerLayer);

    polygonBtn.classList.add("active");
    pinBtn.classList.remove("active");
    toggleContainer.classList.remove("mode-left");
    toggleContainer.classList.add("mode-right");
  }
}

function loadPinPolygons(townData, district) {
  if (pinPolygonsLoaded) return; // 一度だけ読み込む

  const normalize = str => str?.trim().replace(/\s+/g, "") || "";
  const normalizedDistrict = normalize(district);

  const filtered = Object.values(townData).filter(item => normalize(item.city_name) === normalizedDistrict);

  filtered.forEach(item => {
    const city = normalize(item.city_name);
    const area = normalize(item.area_name);
    const geojsonUrl = `https://uedayou.net/loa/東京都${city}.geojson`;

    fetch(geojsonUrl)
      .then(res => res.json())
      .then(geo => {
        const layer = L.geoJSON(geo, {
          style: {
            color: "#666",
            fillColor: "#bbb",
            fillOpacity: 0.0,
            weight: 2
          },
        });
        polygonOtherLayers.push(layer);
        if (currentMode === "pins") {
          layer.addTo(map);
        }
      })
      .catch(err => {
        console.warn("ピンモード用ポリゴンの読み込みに失敗:", geojsonUrl, err);
      });
  });

  pinPolygonsLoaded = true;
}

// 凡例
function legend() {
  const control = L.control({ position: 'topright' });
  control.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML += '<p>地域別進捗率</p>';
    //div.innerHTML += '<p>凡例</p>';
    const grades = [1, 0.75, 0.5, 0.25, 0];
    const container = document.createElement("div");
    container.className = "legend-inner-container";
    container.innerHTML = '<div class="legend-gradient"></div>';
    const labels = document.createElement("div");
    labels.className = "legend-labels";
    grades.forEach(val => labels.innerHTML += `<span>${val * 100}%</span>`);
    container.appendChild(labels);
    div.appendChild(container);
    return div;
  };
  return control;
}

function createFormUrl(lat, lng) {
  const key = `${district}_${name}`;
  const formBaseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSf6_v1OgLXmLMGsTzr6p8lj_Hl7BKBsm1Hrj_ijSttqfjOnVQ/viewform?usp=dialog";
  const coordEntry = "entry.676815150";
  const districtEntry = "entry.381985217";
  const districtName = `${district}_${name}`; 

  // すでに ? が含まれていれば & で、それ以外は ? でつなぐ
  const separator = formBaseUrl.includes("?") ? "&" : "?";
  const fullUrl = `${formBaseUrl}?usp=dialog&${coordEntry}=${lat},${lng}&${districtEntry}=${encodeURIComponent(districtName)}`;
  latestFormUrl = fullUrl;
  
  return fullUrl;
}

function getProgressColor(percentage) {
  // Define the color stops
  const colorStops = [
    { pct: 0.0,   color: { r: 255, g: 255, b: 255 } }, // #ffffff（真っ白）
    { pct: 0.1,   color: { r: 240, g: 220, b: 245 } }, // #f0dcf5（極薄ラベンダー）
    { pct: 0.2,   color: { r: 220, g: 180, b: 235 } }, // #dcb4eb（薄ラベンダー）
    { pct: 0.4,   color: { r: 185, g: 110, b: 210 } }, // #b96ed2（中ラベンダー）
    { pct: 0.7,   color: { r: 140, g: 50,  b: 165 } }, // #8c32a5（濃紫）
    { pct: 1.0,   color: { r: 112, g: 21,  b: 112 } }  // #701570（テーマ色）
  ];
  // Ensure percentage is within bounds
  percentage = Math.max(0, Math.min(1, percentage));

  // Find the two closest color stops
  let lower = colorStops[0];
  let upper = colorStops[colorStops.length - 1];

  for (let i = 1; i < colorStops.length; i++) {
      if (percentage <= colorStops[i].pct) {
          upper = colorStops[i];
          lower = colorStops[i - 1];
          break;
      }
  }

  // Calculate the interpolated color
  const rangePct = (percentage - lower.pct) / (upper.pct - lower.pct);
  const r = Math.round(lower.color.r + rangePct * (upper.color.r - lower.color.r));
  const g = Math.round(lower.color.g + rangePct * (upper.color.g - lower.color.g));
  const b = Math.round(lower.color.b + rangePct * (upper.color.b - lower.color.b));

  // Return the color as a string
  return `rgb(${r}, ${g}, ${b})`;
}

function getGeoJsonStyle(progress) {
  let opacity;
  if (progress <= 0.2) {
    // 0% → 0.05、20% → 0.8（線形補完）
    opacity = 0.05 + (progress / 0.2) * (0.8 - 0.05);
  } else {
    opacity = 0.8;
  }

  return {
    color: 'black',
    fillColor: getProgressColor(progress),
    fillOpacity: opacity,
    weight: 2,
  };
}

// 見出し更新
document.getElementById("header").innerText = `${district} / ${name} \n ポスティング進捗マップ`;


// ボタンのイベント関数
pinBtn.addEventListener("click", () => {
  if (currentMode === "pins") return;

  if (!pinPolygonsLoaded) {
    loadPinPolygons(globalTownData, district); // ← 最初の1回だけ読み込む
  }
  switchDisplayMode("pins");
  loadPinPolygons(globalTownData, district);
  pinBtn.classList.add("active");
  polygonBtn.classList.remove("active");
  toggleContainer.classList.remove("mode-right");
  toggleContainer.classList.add("mode-left");
});

polygonBtn.addEventListener("click", () => {
  if (currentMode === "polygon") return;
  switchDisplayMode("polygon");
  polygonBtn.classList.add("active");
  pinBtn.classList.remove("active");
  toggleContainer.classList.remove("mode-left");
  toggleContainer.classList.add("mode-right");
});

reportBtn.addEventListener("click", () => {
  const modal = new bootstrap.Modal(document.getElementById("reportModal"));
  modal.show();
});

// 現在地から報告
reportFromGPSBtn.addEventListener("click", () => {
  isManualReportingMode = false;
  // モーダルを閉じる
  const modalEl = document.getElementById("reportModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  addressDisplay.textContent = "現在地取得中...";

  if (!navigator.geolocation) {
    addressDisplay.textContent = "このブラウザでは現在地取得に対応していません。";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      gpsLatLng = { lat, lng };
      reportLatLng = { lat, lng };

      // OpenStreetMapで住所取得
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { "Accept-Language": "ja" }
      })
      .then(data => {
        const address = data.display_name || "住所が取得できませんでした";
        addressDisplay.innerHTML = `
          <strong>GPS情報から報告</strong><br>
          緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}<br>
          ${address}
        `;
      
        // フォームボタン表示＆イベントセット
        openFormBtn.style.display = "inline-block";
      })
        .catch(() => {
          addressDisplay.innerHTML = `<strong>報告に使用する住所:</strong><br>座標のみ取得できました<br>${lat.toFixed(5)}, ${lng.toFixed(5)}<br>住所は取得できませんでした。`;
        });
    },
    (error) => {
      addressDisplay.textContent = "現在地の取得に失敗しました。位置情報の利用を許可してください。";
    }
  );
});

reportFromManualBtn.addEventListener("click", () => {
  isManualReportingMode = true;
  // モーダルを閉じる
  const modalEl = document.getElementById("reportModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  // 表示を強制的にピンモードに
  currentMode = "pins";
  switchDisplayMode("pins");

  addressDisplay.innerHTML = `
          <strong>選択した位置から報告</strong><br>
          地図をクリックして登録する位置情報を決定してください
        `;

  // フォームボタンは一旦非表示に
  openFormBtn.style.display = "none";
});


let areaList;
let progress;


// === 地図に関する処理 ===
Promise.all([
  getAreaList(),
  fetch("../data/all_data.json").then(res => {
    if (!res.ok) throw new Error("all_data.json の取得に失敗");
    return res.json();
  }),
  fetch("../data/district_cityname.json").then(res => {
    if (!res.ok) throw new Error("district_cityname.json の取得に失敗");
    return res.json();
  }),
  getAreaListHyosho3() 
])
.then(([areaListRaw, allData, districtCityMap, townData]) => {
  globalTownData = townData
  const normalize = str => str?.trim().replace(/\s+/g, "") || "";
  const normalizedDistrict = normalize(district);
  const normalizedName = normalize(name);

  const entry = districtCityMap[normalizedDistrict];
  const center = entry?.center || [35.6895, 139.6917]; // fallback: 東京都庁
  // 地図初期化
  map = L.map("map").setView(center, 13);
  osm.addTo(map); // ←地図レイヤー追加
  switchDisplayMode("pins");
  loadPinPolygons(globalTownData, district); 
  legend().addTo(map);
  

  map.on("click", function (e) {
    if (currentMode !== "pins") return;
    if (!isManualReportingMode) return; // ← フラグをチェック
  
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
  
    if (userMarker) {
      map.removeLayer(userMarker);
    }
  
    userMarker = L.marker([lat, lng]).addTo(map);
    manualPinLatLng = { lat, lng };
    reportLatLng = manualPinLatLng;
    userMarker.bindPopup(`報告する位置`).openPopup();
    map.setView([lat, lng], 16);
  
    const key = `${district}_${name}`;
    const formBaseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSf6_v1OgLXmLMGsTzr6p8lj_Hl7BKBsm1Hrj_ijSttqfjOnVQ/viewform?usp=dialog";
    const coordEntry = "entry.676815150";
    const districtEntry = "entry.381985217";
    const districtName = `${district}_${name}`; 
    const fullUrl = `${formBaseUrl}?usp=dialog&${coordEntry}=${lat},${lng}&${districtEntry}=${encodeURIComponent(districtName)}`;
    latestFormUrl = fullUrl;
  
    addressDisplay.textContent = "住所を取得中...";
  
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { "Accept-Language": "ja" }
    })
      .then(res => res.json())
      .then(data => {
        const address = data.display_name || "住所が取得できませんでした";
        addressDisplay.innerHTML = `
          <strong>選択した位置から報告</strong><br>
          緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}<br>
          ${address}
        `;
        openFormBtn.style.display = "inline-block";
      })
      .catch(() => {
        addressDisplay.innerHTML = `
          <strong>選択した位置から報告</strong><br>
          緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}<br>
          住所の取得に失敗しました。
        `;
      });
  });
  
  
  

  L.control
  .locate({
    position: "bottomright",
    setView: "once",
    flyTo: true,
    showPopup: false,
    strings: {
      title: "現在地を表示"
    },
    locateOptions: {
      enableHighAccuracy: true
    },
    onLocationError: function (err) {
      alert("現在地の取得に失敗しました：" + err.message);
    },
    onLocationOutsideMapBounds: function () {
      alert("現在地が地図の範囲外です");
    }
  })
  .addTo(map);

  // district → city_name[] に変換
  const cityNames = districtCityMap[normalizedDistrict]?.city
  ? districtCityMap[normalizedDistrict].city.split(",").map(normalize)
  : [normalizedDistrict];


  // city_name を使って areaListRaw をフィルタ
  const filteredAreas = Object.entries(areaListRaw)
    .filter(([_, val]) => cityNames.includes(normalize(val.city_name)))
    .reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
    
  // all_data.json から該当候補者のデータだけを抽出
  const filteredProgressData = {};
  allData.forEach(item => {
    if (
      normalize(item.cityname) === normalizedDistrict &&
      normalize(item.candidate_family) === normalizedName
    ) {
      const matchKey = Object.keys(filteredAreas).find(k =>
        normalize(filteredAreas[k].area_name) === normalize(item.area_name)
      );
      if (matchKey) {
        filteredProgressData[matchKey] = item.flyer_progress;
      } else {
        console.warn("一致するエリアがありません:", item.area_name);
      }
    }
  });

  // 平均進捗を total として算出
  const values = Object.values(filteredProgressData);
  filteredProgressData["total"] = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 0;

  // area_name ベースでマッピング
  const progressMap = {};
  allData.forEach(item => {
    if (
      normalize(item.city_name) === normalizedDistrict &&
      normalize(item.candidate_family) === normalizedName
    ) {
      const areaName = normalize(item.area_name);
      progressMap[areaName] = item.flyer_progress;
    }
  });

  // ポリゴンの描画処理
  for (let [_, areaInfo] of Object.entries(filteredAreas)) {
    const normalizedAreaName = normalize(areaInfo.area_name);
    const progressValue = progressMap[normalizedAreaName] ?? 0;
  
    const geojsonUrl = `https://uedayou.net/loa/東京都${areaInfo.city_name}${areaInfo.area_name}.geojson`;
    fetch(geojsonUrl)
      .then(res => res.json())
      .then(data => {
        const polygon = L.geoJSON(data, {
          style: getGeoJsonStyle(progressValue),
          onEachFeature: (feature, layer) => {
            // 初期ポップアップ（進捗モード用）
            const area = areaInfo.area_name;
            const progress = progressValue;
            layer.bindPopup(`<b>${area}</b><br>ビラ配布進捗: ${(progress * 100).toFixed(1)}%`);
          }
        });
        if (currentMode === "polygon") {
          polygon.addTo(map); // 状況モード中だけ表示
        }
        polygonProgressLayers.push(polygon); // どちらにせよ保持はする 
      })
      .catch(err => console.warn("GeoJSON 読み込み失敗:", geojsonUrl, err));
  }

// === フォームからの報告ピンを読み込んで表示 ===
fetch("/data/all_data_form.json")
  .then(res => res.json())
  .then(data => {
    const districtName = params.get("district");
    const candidateName = params.get("name");
    const key = `${districtName}_${candidateName}`; // 例: "中野区_奥本"

    const reports = data[key];
    if (!reports) {
      console.warn("報告データが見つかりません:", key);
      return;
    }

    reports.forEach(entry => {
      if (!entry.gps) return;

      const [lat, lng] = entry.gps.split(",").map(Number);
      if (isNaN(lat) || isNaN(lng)) return;

      const timestamp = entry.timestamp || "";
      const formattedTime = timestamp.replace(/^.*?(\d{2}\/\d{2})\s(\d{2}:\d{2}).*$/, "$1 $2");

      const popupContent = `
        <strong>日時:</strong> ${formattedTime}<br>
        <strong>枚数:</strong> ${entry.count}<br>
        <strong>建物:</strong> ${entry.building || "特になし"}
      `;

      const marker = L.marker([lat, lng]).bindPopup(popupContent);
      reportMarkerLayer.addLayer(marker);
    });
  })
  .catch(err => {
    console.error("フォームデータの読み込みに失敗:", err);
  });


//progressBox((filteredProgressData["total"] * 100).toFixed(2), "topright").addTo(map);

}).catch(err => {
  console.error("読み込みエラー:", err);
  alert("進捗データの読み込みに失敗しました。URLやファイル名をご確認ください。");
});

openFormBtn.onclick = () => {
  if (!reportLatLng) {
    alert("位置情報が取得されていません。地図をクリックするか、GPSボタンを使用してください。");
    return;
  }
  const { lat, lng } = reportLatLng;
  const url = createFormUrl(lat, lng);
  console.log("開くURL:", url);
  window.open(url, "_blank");
};

// 自分でピンを立てる機能
let userMarker = null;








async function getAreaList() {
  const arealistResponse = await fetch('/data/tokyo_setai.json');
  const arealist = await arealistResponse.json();
  return arealist;
}

async function getAreaListHyosho3() {
  const arealistResponse = await fetch('/data/tokyo_setai_hyosho3.json');
  const arealist = await arealistResponse.json();
  return arealist;
}

async function getProgress() {
  const progressResponse = await fetch('/data/summary.json');
  const progress = await progressResponse.json();
  return progress;
}

async function getProgressCountdown() {
  const progressResponse = await fetch('/data/summary_absolute.json');
  const progress = await progressResponse.json();
  return progress;
}

async function getVoteVenuePins() {
  const response = await fetch('/data/vote_venue.json')
  return response.json();
}

async function getBoardPins(block=null, smallBlock=null) {
  let response
  if (block==null) {
    response = await fetch('/data/all.json')
  } else {
    response = await fetch(`/data/block/${block}.json`)
  }
  const data = await response.json();

  if (smallBlock==null) {
    return data
  } else {
    const smallBlockSplit = smallBlock.split('-')
    const areaName = smallBlockSplit[0]
    const smallBlockId = Number(smallBlockSplit[1])
    const areaList = await getAreaList();
    const areaId = Number(findKeyByAreaName(areaList, areaName))
    const filteredData = filterDataByAreaIdAndSmallBlock(data, areaId, smallBlockId);

    return filteredData
  }

}

/*
async function loadVoteVenuePins(layer) {
  const pins = await getVoteVenuePins();
  pins.forEach(pin => {
    var marker = L.marker([pin.lat, pin.long], {
      icon: grayIcon
    }).addTo(layer);
    marker.bindPopup(`<b>期日前投票所: ${pin.name}</b><br>${pin.address}<br>期間: ${pin.period}<br>座標: <a href="https://www.google.com/maps/search/${pin.lat},+${pin.long}" target="_blank" rel="noopener noreferrer">(${pin.lat}, ${pin.long})</a>`);
  });
}
*/


function progressBox(progressValue, position){
  var control = L.control({position: position});
  control.onAdd = function () {

      var div = L.DomUtil.create('div', 'info progress')

      div.innerHTML += '<p>進捗状況 (全域)</p>'
      div.innerHTML += `<p><span class="progressValue">${progressValue}</span>%</p>`

      return div;
  };

  return control
}

function progressBoxCountdown(progressValue, position){
  var control = L.control({position: position});
  control.onAdd = function () {

      var div = L.DomUtil.create('div', 'info progress')

      div.innerHTML += '<p>残り</p>'
      div.innerHTML += `<p><span class="progressValue">${progressValue}</span>ヶ所</p>`

      return div;
  };

  return control
}

// Base map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})
const googleMap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  maxZoom: 18,
  subdomains:['mt0','mt1','mt2','mt3'],
  attribution: '&copy; Google'
});
const japanBaseMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
})

const grayIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
  iconSize: [20, 32.8],
  popupAnchor: [1, -10],
  shadowSize: [32.8, 32.8],
  className: "icon-gray",
});