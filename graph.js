export class Graph {
  constructor() {
    this.matrix = [];
    this.seed = 4401;
    this.m = 2 ** 32;
    this.k = 0.845;
  }

  random() {
    this.seed = (1103515245 * this.seed + 12345) % this.m;
    return (this.seed / this.m) * 2;
  }

  matrixGenerate(size = 10) {
    this.matrix = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        let val = this.random() * this.k;
        row.push(val < 1 ? 0 : 1);
      }
      this.matrix.push(row);
    }
  }

  findStart() {
    for (let i = 0; i < this.matrix.length; i++) {
      if (this.matrix[i].some((v) => v === 1)) return i;
    }
    return 0;
  }

  getTraversalSteps(type = 'BFS') {
    const visited = new Set();
    const steps = [];
    const structure = [this.findStart()];
    const isDFS = type === 'DFS';

    while (structure.length > 0) {
      const node = isDFS ? structure.pop() : structure.shift();
      if (!visited.has(node)) {
        visited.add(node);
        steps.push({ type: 'visit', node });

        for (let neighbor = 0; neighbor < this.matrix.length; neighbor++) {
          if (this.matrix[node][neighbor] === 1 && !visited.has(neighbor)) {
            steps.push({ type: 'tree-edge', from: node, to: neighbor });
            isDFS ? structure.push(neighbor) : structure.push(neighbor);
          }
        }
      }
    }

    return steps;
  }
}
