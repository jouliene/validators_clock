function renderMapStatsLoading() {
  updateMapStatsTitle();
  const summary = $("mapStatsSummary");
  const content = $("mapStatsContent");
  if (summary) {
    summary.textContent = "-";
    summary.removeAttribute("title");
  }
  if (content) {
    content.innerHTML = `<div class="map-stats-state">Loading stats</div>`;
  }
}

function renderMapStatsError(error) {
  const summary = $("mapStatsSummary");
  const content = $("mapStatsContent");
  if (summary) {
    summary.textContent = "Stats unavailable";
    summary.removeAttribute("title");
  }
  if (content) {
    content.innerHTML = `<div class="map-stats-state is-error">${escapeHtml(formatValidatorMapError(error))}</div>`;
  }
}

function renderMapStats() {
  updateMapStatsTitle();
  const summary = $("mapStatsSummary");
  const content = $("mapStatsContent");
  if (!summary || !content) {
    return;
  }

  const validators = state.snapshot?.current_set?.validators || [];
  const nodes = validatorMapNodes && validatorMapNodesChainId === state.selectedChainId ? validatorMapNodes : [];
  const stats = buildMapStats(nodes, validators);
  const token = state.snapshot?.chain?.token_symbol || "";

  if (!stats.totalNodes) {
    summary.textContent = "No mapped validators";
    summary.removeAttribute("title");
    content.innerHTML = `<div class="map-stats-state">No mapped ${escapeHtml(currentMapChainName())} validators</div>`;
    return;
  }

  summary.textContent = statsSummaryText(stats, token);
  summary.title = "Countries are grouped by geo IP country. Locations are city/coordinate clusters from the active map data.";

  content.innerHTML = `
    <div class="map-stats-overview">
      ${statsCardHtml("Round", activeRoundStatsLabel(stats), "active validator set", "Current active round used for this stats panel.")}
      ${statsCardHtml("Mapped", `${formatInteger(stats.totalNodes)} / ${formatInteger(stats.networkValidators)}`, "validators with IP", "Mapped validators are active validators that have a current IP/location row in the map file.")}
      ${statsCardHtml("Stake", `${formatStatsStake(stats.mappedStake)} ${escapeHtml(token)}`, `${formatPercent(stats.mappedStakePercent)} mapped`, "Stake is summed across the mapped active validators.")}
      ${statsCardHtml("Best Single Site", escapeHtml(stats.bestCandidate?.name || "-"), stats.bestCandidate ? `${formatDistance(stats.bestCandidate.weightedAverageKm)} stake-weighted avg` : "-", "Best single site is the candidate city with the lowest stake-weighted average geographic distance to mapped validators.")}
    </div>
    <div class="map-stats-layout">
      <section class="map-stats-block map-stats-block-countries">
        <h3 title="Top 10 countries by active mapped stake. Totals include all mapped countries.">Top 10 Countries</h3>
        ${statsCountryTableHtml(stats.countryRows, stats, token)}
      </section>
      <section class="map-stats-block map-stats-block-placement">
        <h3 title="Candidate cities ranked by stake-weighted average geographic distance to mapped active validators.">Best Location</h3>
        ${statsPlacementHtml(stats)}
      </section>
      <section class="map-stats-block map-stats-block-cities">
        <h3 title="Top city/location clusters by active mapped stake.">Top City Clusters</h3>
        ${statsRankTableHtml(stats.locationRows.slice(0, 8), token)}
      </section>
      <section class="map-stats-block map-stats-block-isps">
        <h3 title="Top ISP clusters by active mapped stake.">Top ISP Clusters</h3>
        ${statsRankTableHtml(stats.ispRows.slice(0, 8), token)}
      </section>
    </div>
  `;
}

function statsSummaryText(stats, token) {
  const color = stats.roundColor ? `${formatStatsRoundColor(stats.roundColor)} ` : "";
  return `Active ${color}round ${stats.roundId || "-"} / ${formatInteger(stats.totalNodes)} mapped validators / ${formatInteger(stats.countryRows.length)} countries / ${formatInteger(stats.locationRows.length)} locations / ${formatStatsStake(stats.mappedStake)} ${token}`;
}

function activeRoundStatsLabel(stats) {
  const color = stats.roundColor ? `${formatStatsRoundColor(stats.roundColor)} ` : "";
  return `${color}${stats.roundId || "-"}`;
}

function formatStatsRoundColor(value) {
  const color = String(value || "").trim();
  return color ? `${color.slice(0, 1).toUpperCase()}${color.slice(1).toLowerCase()}` : "";
}

function statsCardHtml(label, value, detail, tooltip = "") {
  return `
    <div class="map-stats-card"${tooltip ? ` title="${escapeHtml(tooltip)}"` : ""}>
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function statsCountryTableHtml(rows, stats, token) {
  const visibleRows = rows.slice(0, 10);
  return `
    <div class="map-stats-table-shell">
      <table class="map-stats-table">
        <thead>
          <tr>
            <th scope="col">Country</th>
            <th scope="col">Nodes</th>
            <th scope="col">Stake</th>
            <th scope="col">Stake %</th>
            <th scope="col">Weight %</th>
          </tr>
        </thead>
        <tbody>
          ${visibleRows.map((row) => statsCountryRowHtml(row, token)).join("")}
          <tr class="is-total">
            <td>Mapped total</td>
            <td>${formatInteger(stats.totalNodes)}</td>
            <td>${formatStatsStake(stats.mappedStake)} ${escapeHtml(token)}</td>
            <td>${formatPercent(stats.mappedStakePercent)}</td>
            <td>${formatPercent(stats.mappedWeightPercent)}</td>
          </tr>
          <tr class="is-total is-network-total">
            <td>Network total</td>
            <td>${formatInteger(stats.networkValidators)}</td>
            <td>${formatStatsStake(stats.networkStake)} ${escapeHtml(token)}</td>
            <td>100.00%</td>
            <td>100.00%</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function statsCountryRowHtml(row, token) {
  return `
    <tr>
      <td>${escapeHtml(row.label)}</td>
      <td>${formatInteger(row.nodes)}</td>
      <td>${formatStatsStake(row.stake)} ${escapeHtml(token)}</td>
      <td>${formatPercent(row.stakePercent)}</td>
      <td>${formatPercent(row.weightPercent)}</td>
    </tr>
  `;
}

function statsPlacementHtml(stats) {
  const medoid = stats.medoid;
  const candidates = stats.candidateRows.slice(0, 5);
  return `
    <div class="map-stats-placement">
      <div class="map-stats-medoid" title="Actual medoid is the existing validator location with the lowest stake-weighted average geographic distance to all mapped validators.">
        <span>Actual Medoid</span>
        <strong>${escapeHtml(medoid?.label || "-")}</strong>
        <small>${medoid ? `${formatDistance(medoid.weightedAverageKm)} stake-weighted avg` : "-"}</small>
      </div>
      <div class="map-stats-table-shell">
        <table class="map-stats-table">
          <thead>
            <tr>
              <th scope="col">Site</th>
              <th scope="col" title="Stake-weighted average geographic distance from this site to mapped active validators.">Weighted avg</th>
              <th scope="col">Median</th>
              <th scope="col">P90</th>
            </tr>
          </thead>
          <tbody>
            ${candidates.map((row) => `
            <tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${formatDistance(row.weightedAverageKm)}</td>
              <td>${formatDistance(row.medianKm)}</td>
              <td>${formatDistance(row.p90Km)}</td>
            </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function statsRankTableHtml(rows, token) {
  return `
    <div class="map-stats-table-shell">
      <table class="map-stats-table">
        <thead>
          <tr>
            <th scope="col">Cluster</th>
            <th scope="col">Nodes</th>
            <th scope="col">Stake</th>
            <th scope="col">Weight %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>${formatInteger(row.nodes)}</td>
            <td>${formatStatsStake(row.stake)} ${escapeHtml(token)}</td>
            <td>${formatPercent(row.weightPercent)}</td>
          </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildMapStats(nodes, validators) {
  const validatorsByPeer = new Map();
  let networkStake = 0;
  let networkWeightPercent = 0;

  for (const validator of Array.isArray(validators) ? validators : []) {
    const peer = String(validator.public_key || "").toLowerCase();
    if (!peer) {
      continue;
    }
    const stake = mapStatsNumericValue(validator.stake);
    const weightPercent = mapStatsNumericValue(validator.weight_percent);
    validatorsByPeer.set(peer, { ...validator, stakeNumber: stake, weightPercentNumber: weightPercent });
    networkStake += stake;
    networkWeightPercent += weightPercent;
  }

  const validNodes = (Array.isArray(nodes) ? nodes : [])
    .map((node) => {
      const peer = String(node.peer || "").toLowerCase();
      const validator = validatorsByPeer.get(peer);
      const lat = Number(node.lat);
      const lon = Number(node.lon);
      return {
        ...node,
        peer,
        validator,
        stake: validator?.stakeNumber || 0,
        weightPercent: validator?.weightPercentNumber || 0,
        lat,
        lon,
      };
    })
    .filter((node) => node.peer && Number.isFinite(node.lat) && Number.isFinite(node.lon));

  const countryRows = aggregateStatsRows(validNodes, (node) => normalizeStatsCountry(node.country), networkStake);
  const locationRows = aggregateStatsRows(validNodes, (node) => statsLocationLabel(node), networkStake);
  const ispRows = aggregateStatsRows(validNodes, (node) => String(node.isp || "Unknown"), networkStake);
  const mappedStake = validNodes.reduce((sum, node) => sum + node.stake, 0);
  const mappedWeightPercent = validNodes.reduce((sum, node) => sum + node.weightPercent, 0);
  const candidateRows = statsPlacementCandidates(validNodes);
  const medoid = statsMedoid(validNodes);
  const currentSet = state.snapshot?.current_set || {};

  return {
    roundId: currentSet.round_id || "",
    roundColor: currentSet.round_color || "",
    totalNodes: validNodes.length,
    networkValidators: validatorsByPeer.size,
    networkStake,
    networkWeightPercent,
    mappedStake,
    mappedStakePercent: networkStake ? (mappedStake / networkStake) * 100 : 0,
    mappedWeightPercent: networkWeightPercent ? (mappedWeightPercent / networkWeightPercent) * 100 : mappedWeightPercent,
    countryRows,
    locationRows,
    ispRows,
    candidateRows,
    bestCandidate: candidateRows[0] || null,
    medoid,
  };
}

function aggregateStatsRows(nodes, labelForNode, networkStake) {
  const rows = new Map();
  for (const node of nodes) {
    const label = labelForNode(node) || "Unknown";
    if (!rows.has(label)) {
      rows.set(label, {
        label,
        nodes: 0,
        stake: 0,
        weightPercent: 0,
      });
    }
    const row = rows.get(label);
    row.nodes += 1;
    row.stake += node.stake;
    row.weightPercent += node.weightPercent;
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      stakePercent: networkStake ? (row.stake / networkStake) * 100 : 0,
    }))
    .sort((left, right) => right.stake - left.stake || right.nodes - left.nodes || left.label.localeCompare(right.label));
}

function statsPlacementCandidates(nodes) {
  const candidates = [
    ["London", 51.5074, -0.1278],
    ["Amsterdam", 52.3676, 4.9041],
    ["Paris", 48.8566, 2.3522],
    ["Dublin", 53.3498, -6.2603],
    ["Frankfurt", 50.1109, 8.6821],
    ["Helsinki", 60.1699, 24.9384],
    ["Warsaw", 52.2297, 21.0122],
    ["New York", 40.7128, -74.0060],
    ["Ashburn", 39.0438, -77.4874],
    ["Singapore", 1.3521, 103.8198],
  ];

  return candidates
    .map(([name, lat, lon]) => ({ name, ...distanceStatsForPoint(nodes, lat, lon) }))
    .sort((left, right) => left.weightedAverageKm - right.weightedAverageKm);
}

function statsMedoid(nodes) {
  let best = null;
  for (const node of nodes) {
    const stats = distanceStatsForPoint(nodes, node.lat, node.lon);
    if (!best || stats.weightedAverageKm < best.weightedAverageKm) {
      best = {
        label: statsLocationLabel(node),
        ...stats,
      };
    }
  }
  return best;
}

function distanceStatsForPoint(nodes, lat, lon) {
  const distances = [];
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const node of nodes) {
    const distance = distanceBetweenCoordinatesKm(lat, lon, node.lat, node.lon);
    const weight = node.stake > 0 ? node.stake : Math.max(node.weightPercent, 1);
    distances.push(distance);
    weightedTotal += distance * weight;
    totalWeight += weight;
  }

  distances.sort((left, right) => left - right);
  return {
    weightedAverageKm: totalWeight ? weightedTotal / totalWeight : 0,
    medianKm: percentileFromSorted(distances, 0.5),
    p90Km: percentileFromSorted(distances, 0.9),
  };
}

function percentileFromSorted(values, percentile) {
  if (!values.length) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.floor(values.length * percentile)));
  return values[index];
}

function statsLocationLabel(node) {
  const city = String(node.city || "").trim();
  const country = normalizeStatsCountry(node.country);
  return city && country ? `${city}, ${country}` : city || country || "Unknown";
}

function normalizeStatsCountry(value) {
  const country = String(value || "").trim();
  return country === "The Netherlands" ? "Netherlands" : country || "Unknown";
}

function mapStatsNumericValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatStatsStake(value) {
  return formatTokenAmount(value, 0, 3);
}

function formatInteger(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDistance(value) {
  return `${Math.round(Number(value || 0)).toLocaleString()} km`;
}
