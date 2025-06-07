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
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconNotAchieved = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: null,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

let map; // ← global にする（エラー回避のため）！
let allMarkers = [];
let clusterGroup = null;


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

        clusterGroup = L.markerClusterGroup({
          maxClusterRadius: 60,
          disableClusteringAtZoom: 15
        });
        map.addLayer(clusterGroup);

  
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

      clusterGroup.clearLayers();
      allMarkers = []; // ← 忘れずにリセット
      
      districtPins.forEach(entry => {
        const lat = entry.altitude;
        const lng = entry.latitude;
        const isAchieved = (entry.status === true);
      
        if (isAchieved) {
          achievedCount++;
        }
      
        const popupContent = `
          <strong>番号:</strong> ${entry.id}<br>
          <strong>場所:</strong> ${entry.place}<br>
          <strong>住所:</strong> ${entry.address}<br>
          <strong>備考:</strong> ${entry.note || "なし"}
        `;
      
        const marker = L.marker([lat, lng], {
          icon: isAchieved ? iconAchieved : iconNotAchieved
        }).bindPopup(popupContent);
      
        marker.isAchieved = isAchieved;
        clusterGroup.addLayer(marker);
        allMarkers.push(marker);
      });
      
      // プログレスバー更新
      const totalCount = districtPins.length;
      const percent = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0;
      
      const progressBar = document.getElementById("progress-bar");
      progressBar.style.width = `${percent.toFixed(1)}%`;
      progressBar.setAttribute("aria-valuenow", percent.toFixed(1));
      
      // 達成率テキスト更新
      const progressText = document.getElementById("progress-text");
      progressText.textContent = `達成率: ${percent.toFixed(1)}%`;
      
      // A / B 表示
      const progressFraction = document.getElementById("progress-fraction");
      progressFraction.textContent = `${achievedCount} / ${totalCount}`;
      
    })
    .catch(err => {
      console.error("poster_data_form.json の読み込みに失敗:", err);
    });

    document.getElementById("pinBtn").addEventListener("click", function() {
      this.classList.add("active");
      document.getElementById("polygonBtn").classList.remove("active");
      document.querySelector(".toggle-indicator").style.transform = "translateX(0%)";
    
      clusterGroup.clearLayers();
      allMarkers.forEach(marker => {
        clusterGroup.addLayer(marker);
      });
    });
    
    document.getElementById("polygonBtn").addEventListener("click", function() {
      this.classList.add("active");
      document.getElementById("pinBtn").classList.remove("active");
      document.querySelector(".toggle-indicator").style.transform = "translateX(100%)";
    
      clusterGroup.clearLayers();
      allMarkers.forEach(marker => {
        if (!marker.isAchieved) {
          clusterGroup.addLayer(marker);
        }
      });
    });
    
// 報告ボタン → ダイレクトにフォームを開く
const reportBtn = document.getElementById("reportBtn");

reportBtn.addEventListener("click", () => {
  const formBaseUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfaLuC0iVd4kslpqHbqrkKYC-wDDxglMg8Cwsyc9TFBvostMA/viewform?usp=dialog";
  window.open(formBaseUrl, "_blank");
}
);}
  
document.addEventListener("DOMContentLoaded", () => {
  const reportBtn = document.getElementById("reportBtn");
  const targetDistricts = ["八王子市", "中央区"];

  if (reportBtn) {
    if (targetDistricts.includes(district)) {
      reportBtn.addEventListener("click", () => {
        const formBaseUrl = "https://forms.gle/JrCGxhqpeKhAuPv7A";
        window.open(formBaseUrl, "_blank");
      });
    } else {
      reportBtn.style.display = "none";
    }
  }
});
