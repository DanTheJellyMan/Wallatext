const longArr = Array.from({"length": 100}, () => 1e9);
const { Worker } = require("worker_threads");

run(longArr, 16);

function chunkify(array, n) {
    let chunks = [];
    for (let i=n; i>0; i--) {
        chunks.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return chunks;
}

function run(jobs, concurrentWorkers) {
    const chunks = chunkify(jobs, concurrentWorkers);
    const start = performance.now();
    let completedWorkers = 0;
    
    chunks.forEach((data, i) => {
        const worker = new Worker("./test_worker.js");
        worker.postMessage(data);
        worker.on("message", () =>  {
            completedWorkers++;
            if (completedWorkers === concurrentWorkers) {
                console.log(
                    `${concurrentWorkers} workers:`,
                    `${(performance.now() - start)/1000} seconds`
                );
            }
        });
    });
    
}