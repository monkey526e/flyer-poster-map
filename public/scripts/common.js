document.addEventListener('DOMContentLoaded', () => {
  loadFlyerStatistics();
});

async function loadFlyerStatistics() {
  const res = await fetch('../data/statistics.json');
  const stats = await res.json();

  const totalElem = document.getElementById("flyer-total");
  const last7Elem = document.getElementById("flyer-last7");
  const changeElem = document.getElementById("flyer-change");

  if (totalElem && last7Elem && changeElem) {
    totalElem.textContent = stats.total_flyers.toLocaleString();
    last7Elem.textContent = stats.last_7_days.toLocaleString();
    const change = stats.change_percent;
    changeElem.textContent = `${change >= 0 ? '+' : ''}${change}%`;
    changeElem.classList.toggle("text-success", change >= 0);
    changeElem.classList.toggle("text-danger", change < 0);
  } else {
    console.warn("一部の統計表示要素が見つかりません");
  }
}
