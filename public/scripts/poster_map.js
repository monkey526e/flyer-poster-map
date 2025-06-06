const params = new URLSearchParams(window.location.search);
const district = params.get("district");
let name = params.get("name");
const group = params.get("name");

// group パラメータが true の場合は name を グループ に変更
if (group === "True") {
  name = "グループ";
}
document.getElementById("header").innerText = `${district} / ${name}`;


const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});


const iconAchieved = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconNotAchieved = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

let map; // ← global にする（エラー回避のため）！
let allMarkers = [];

// fetch candidates_all.json → name の更新
fetch("/data/candidates_all.json")
  .then(res => res.json())
  .then(candidates => {
    const normalize = str => str?.trim().replace(/\s+/g, "") || "";
    const normalizedDistrict = normalize(district);
    const normalizedName = normalize(name);

    const matchedCandidate = candidates.find(c =>
      normalize(c.district) === normalizedDistrict &&
      normalize(c.name) === normalizedName
    );

    if (matchedCandidate && matchedCandidate.group === true) {
      name = "グループ";
    }


    // 地図初期化はここで1回だけ
    initializeMapAndPins();
  })
  .catch(err => {
    console.error("candidates_all.json の読み込みに失敗:", err);

    initializeMapAndPins();
  });

  function initializeMapAndPins() {
    fetch("/data/district_cityname.json")
      .then(res => res.json())
      .then(districtData => {
        const center = districtData[district]?.center;
        const mapCenter = center || [30.681236, 139.767125]; // fallback
  
        // map 初期化
        map = L.map("map").setView(mapCenter, 13);
        osm.addTo(map);
  
        // 現在地ボタン追加
        L.control.locate({
          position: "topleft",
          strings: { title: "現在地を表示" },
          drawCircle: true,
          showPopup: true,
          locateOptions: { enableHighAccuracy: true }
        }).addTo(map);
  
        // poster_data_form.json 読み込み・ピン描画はここから呼ぶ
        loadPins();
      })
      .catch(err => {
        console.error("district_cityname.json の読み込みに失敗:", err);
      });
  }
  
  function loadPins() {
    fetch("/data/poster_data_form.json")
    .then(res => res.json())
    .then(data => {
      const districtPins = data[district];
      if (!districtPins) {
        console.warn("poster_data_form.json に district が見つかりません:", district);
        return;
      }
  
      let achievedCount = 0;
      let notAchievedCount = 0;
  
      districtPins.forEach(entry => {
        if (entry.status === true) {
          achievedCount++;
        } else if (entry.status === false) {
          notAchievedCount++;
        }
  
        const lat = entry.altitude;
        const lng = entry.latitude;
  
        const isAchieved = (entry.status === true);
  
        const popupContent = `
          <strong>項版:</strong> ${entry.id}<br>  
          <strong>場所:</strong> ${entry.place}<br>
          <strong>住所:</strong> ${entry.address}<br>
          <strong>備考:</strong> ${entry.note || "なし"}<br>
          <strong>状況:</strong> 
          <span>
            ${entry.status ? '掲示済' : '未掲示'}
          </span>
        `;
  
        const marker = L.marker([lat, lng], {
          icon: isAchieved ? iconAchieved : iconNotAchieved
        }).bindPopup(popupContent);
        
        marker.isAchieved = isAchieved; // ← これが超重要！
        
        marker.addTo(map);
        allMarkers.push(marker);
      });
  
      // プログレスバー更新
const totalCount = achievedCount + notAchievedCount;
const percent = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0;

const progressBar = document.getElementById("progress-bar");
progressBar.style.width = `${percent.toFixed(1)}%`;
progressBar.setAttribute("aria-valuenow", percent.toFixed(1));

// 達成率テキスト更新
const progressText = document.getElementById("progress-text");
progressText.textContent = `達成率: ${percent.toFixed(1)}%`;
    })
    .catch(err => {
      console.error("poster_data_form.json の読み込みに失敗:", err);
    });

    document.getElementById("pinBtn").addEventListener("click", function() {
      // ボタンの active クラス切り替え
      this.classList.add("active");
      document.getElementById("polygonBtn").classList.remove("active");
    
      // toggle-indicator を左に
      document.querySelector(".toggle-indicator").style.transform = "translateX(0%)";
    
      // 全マーカー表示
      allMarkers.forEach(marker => {
        map.addLayer(marker);
      });
    });
    
    document.getElementById("polygonBtn").addEventListener("click", function() {
      // ボタンの active クラス切り替え
      this.classList.add("active");
      document.getElementById("pinBtn").classList.remove("active");
    
      // toggle-indicator を右に
      document.querySelector(".toggle-indicator").style.transform = "translateX(100%)";
    
      // 未掲示のみ表示
      allMarkers.forEach(marker => {
        map.removeLayer(marker); // 一度全部消す
    
        if (!marker.isAchieved) {
          map.addLayer(marker);
        }
      });
    });
    

  }
  