const N_SIZE = 10;
const N1 = 4;
const N2 = 4;
const N3 = 0;
const N4 = 1;

class RandomGenerator {
  constructor(seed) {
    this.seed = parseInt(seed);
    if (isNaN(this.seed)) {
      console.error(
        'Invalid seed provided to RandomGenerator, using fallback 1234'
      );
      this.seed = 1234;
    }
    this.m = Math.pow(2, 32);
    this.a = 1103515245;
    this.c = 12345;
  }

  getRandom(range = 1) {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return (this.seed / this.m) * range;
  }
}

function generateStaticAdir(n_val, n1_val, n2_val, n3_val, n4_val) {
  const localAdir = [];
  const seedValue = `${n1_val}${n2_val}${n3_val}${n4_val}`;
  const randomGen = new RandomGenerator(seedValue);

  const k_coeff = 1.0 - n3_val * 0.01 - n4_val * 0.005 + 0.05;
  console.log(
    `Static Adir generation: n=${n_val}, seed=${seedValue}, k=${k_coeff.toFixed(
      4
    )}`
  );

  for (let i = 0; i < n_val; i++) {
    const row = [];
    for (let j = 0; j < n_val; j++) {
      const randomVal = randomGen.getRandom(2.0);
      const multipliedVal = randomVal * k_coeff;
      row.push(multipliedVal >= 1.0 ? 1 : 0);
    }
    localAdir.push(row);
  }
  console.log(
    'Generated Static Adir (Directed):',
    JSON.parse(JSON.stringify(localAdir))
  );
  return localAdir;
}

class GraphProcessor {
  constructor(n_val, initialAdir, n1_val, n2_val, n3_val, n4_val) {
    this.n = n_val;
    this.Adir = initialAdir;

    const seedForB = `${n1_val}${n2_val}${n3_val}${n4_val}`;
    this.randomGenForB = new RandomGenerator(seedForB);
    this.Aundir = [];
    this.W = [];
  }

  generateAundir() {
    this.Aundir = Array.from({ length: this.n }, () => Array(this.n).fill(0));
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (this.Adir[i][j] === 1 || this.Adir[j][i] === 1) {
          this.Aundir[i][j] = 1;
        }
      }
    }

    for (let i = 0; i < this.n; i++) {
      for (let j = i + 1; j < this.n; j++) {
        if (this.Aundir[i][j] === 1 || this.Aundir[j][i] === 1) {
          this.Aundir[i][j] = 1;
          this.Aundir[j][i] = 1;
        }
      }
      this.Aundir[i][i] = 0;
    }
    console.log(
      'Generated Aundir (Undirected):',
      JSON.parse(JSON.stringify(this.Aundir))
    );
    return this.Aundir;
  }

  generateWeightMatrixW() {
    const B = Array.from({ length: this.n }, () =>
      Array(this.n)
        .fill(0)
        .map(() => this.randomGenForB.getRandom(2.0))
    );

    const C = Array.from({ length: this.n }, (_, i) =>
      Array(this.n)
        .fill(0)
        .map((_, j) => Math.ceil(B[i][j] * 100 * this.Aundir[i][j]))
    );

    const D = Array.from({ length: this.n }, (_, i) =>
      Array(this.n)
        .fill(0)
        .map((_, j) => (C[i][j] > 0 ? 1 : 0))
    );

    const H = Array.from({ length: this.n }, (_, i) =>
      Array(this.n)
        .fill(0)
        .map((_, j) => (D[i][j] === D[j][i] ? 1 : 0))
    );

    const tr_component_value = 1;

    this.W = Array.from({ length: this.n }, () => Array(this.n).fill(0));
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (i === j) {
          this.W[i][j] = 0;
          continue;
        }
        if (this.Aundir[i][j] === 1) {
          this.W[i][j] = (D[i][j] + H[i][j] + tr_component_value) * C[i][j];
        } else {
          this.W[i][j] = 0;
        }
      }
    }
    for (let i = 0; i < this.n; i++) {
      for (let j = i + 1; j < this.n; j++) {
        if (this.W[i][j] !== this.W[j][i]) {
          const val = (D[i][j] + H[i][j] + tr_component_value) * C[i][j];
          this.W[i][j] = val;
          this.W[j][i] = val;
        }
      }
      this.W[i][i] = 0;
    }
    console.log(
      'Generated W (Weight Matrix):',
      JSON.parse(JSON.stringify(this.W))
    );
    return this.W;
  }

  getGraphDataForCytoscape() {
    const elements = [];
    for (let i = 0; i < this.n; i++) {
      elements.push({ group: 'nodes', data: { id: `v${i}`, label: `${i}` } });
    }
    for (let i = 0; i < this.n; i++) {
      for (let j = i + 1; j < this.n; j++) {
        if (this.Aundir[i][j] === 1 && this.W[i][j] > 0) {
          elements.push({
            group: 'edges',
            data: {
              id: `e${i}-${j}`,
              source: `v${i}`,
              target: `v${j}`,
              weight: this.W[i][j],
              label: this.W[i][j].toString(),
            },
          });
        }
      }
    }
    return elements;
  }
}

class PrimAlgorithmStepByStep {
  constructor(numVertices, weightMatrix) {
    this.numVertices = numVertices;
    this.weightMatrix = weightMatrix;
    this.mstEdges = [];
    this.visited = new Array(numVertices).fill(false);
    this.minEdgeToReach = new Array(numVertices).fill(null);
    this.costToReach = new Array(numVertices).fill(Infinity);
    this.currentStepNum = 0;
    this.isStarted = false;
    this.isFinished = false;
    this.stepsHistory = [];
  }

  start(startNodeIndex = 0) {
    if (this.numVertices === 0) {
      this.isFinished = true;
      this.stepsHistory.push({ type: 'finish', message: 'Граф порожній.' });
      return;
    }
    this.isStarted = true;
    this.costToReach[startNodeIndex] = 0;
    this.stepsHistory.push({
      type: 'vertex',
      vertex: startNodeIndex,
      message: `Алгоритм Пріма: Починаємо з вершини ${startNodeIndex}.`,
    });
  }

  nextStep() {
    if (this.isFinished || !this.isStarted) return null;
    let u_nextVertex = -1;
    let minCostFound = Infinity;
    for (let v_idx = 0; v_idx < this.numVertices; v_idx++) {
      if (!this.visited[v_idx] && this.costToReach[v_idx] < minCostFound) {
        minCostFound = this.costToReach[v_idx];
        u_nextVertex = v_idx;
      }
    }
    if (u_nextVertex === -1) {
      this.isFinished = true;
      const totalWeight = this.mstEdges.reduce(
        (sum, edge) => sum + edge.weight,
        0
      );
      const finishMessage = `Алгоритм завершено. Всі доступні вершини оброблені. Загальна вага MST: ${totalWeight}.`;
      this.stepsHistory.push({ type: 'finish', message: finishMessage });
      return { type: 'finish', message: finishMessage };
    }
    this.visited[u_nextVertex] = true;
    const addedEdgeInfo = this.minEdgeToReach[u_nextVertex];
    let stepInfo;
    if (
      addedEdgeInfo &&
      addedEdgeInfo.from !== -1 &&
      typeof addedEdgeInfo.from !== 'undefined'
    ) {
      this.mstEdges.push(addedEdgeInfo);
      stepInfo = {
        type: 'edge',
        edge: {
          ...addedEdgeInfo,
          source: `v${addedEdgeInfo.from}`,
          target: `v${addedEdgeInfo.to}`,
        },
        message: `Додаємо ребро (${addedEdgeInfo.from}-${addedEdgeInfo.to}) з вагою ${addedEdgeInfo.weight}. Вершина ${addedEdgeInfo.to} тепер в MST.`,
      };
    } else {
      stepInfo = {
        type: 'vertex',
        vertex: u_nextVertex,
        message: `Вершина ${u_nextVertex} оброблена (стартова).`,
      };
    }
    this.stepsHistory.push(stepInfo);
    for (let v_neighbor = 0; v_neighbor < this.numVertices; v_neighbor++) {
      const weight_uv = this.weightMatrix[u_nextVertex][v_neighbor];
      if (
        weight_uv > 0 &&
        !this.visited[v_neighbor] &&
        weight_uv < this.costToReach[v_neighbor]
      ) {
        this.costToReach[v_neighbor] = weight_uv;
        this.minEdgeToReach[v_neighbor] = {
          from: u_nextVertex,
          to: v_neighbor,
          weight: weight_uv,
        };
      }
    }
    this.currentStepNum++;
    return stepInfo;
  }
  getMSTEdges() {
    return this.mstEdges.map((edge) => ({
      ...edge,
      source: `v${edge.from}`,
      target: `v${edge.to}`,
    }));
  }
}
