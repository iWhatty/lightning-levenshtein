
// ./bench/bench.js

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const fs = require("fs");
const Benchmark = require("benchmark");


import { levenshteinLightning } from './lightning-levenshtein-v2.min.js'

// import { distanceMax as distMax, distance } from "../src/index.js";
import { closest, distance, distanceMax } from "../dist/lightning-levenshtein.min.js";

import { distance as distFast } from "./mod.js";

import { myers_x as myers_x_old_v2 } from "./myers-x-variants/myers_x_old_v2.js";




import fastLevenshteinPkg from "fast-levenshtein";
const { get: fastLevenshtein } = fastLevenshteinPkg;

const leven = require("leven");
const jslevenshtein = require("js-levenshtein");
import { levenshteinEditDistance } from "levenshtein-edit-distance"

const suite = new Benchmark.Suite();

const randomstring = (length) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    // const characters = "abcdefghijklmnopqrstuvwxyz";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

// Mixed-length data generator
const randomMixedStringArr = (arraySize, minLen = 1, maxLen = 64) => {
    const arr = [];
    for (let i = 0; i < arraySize; i++) {
        const len = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
        arr.push(randomstring(len));
    }
    return arr;
};


const randomstringArr = (stringSize, arraySize) => {
    let i = 0;
    const arr = [];
    for (i = 0; i < arraySize; i++) {
        arr.push(randomstring(stringSize));
    }
    return arr;
};

const arrSize = 200;
const dataStr = "data256.json";
// const dataStr = "data10.json";
// const dataStr = "data2.json";
if (!fs.existsSync(dataStr)) {

    // const data = [
    //     randomstringArr(1, arrSize), // 0
    //     randomstringArr(2, arrSize), // 1
    //     randomstringArr(3, arrSize), // 2
    //     randomstringArr(4, arrSize), // 3
    //     randomstringArr(5, arrSize), // 4
    //     randomstringArr(6, arrSize), // 5
    //     randomstringArr(7, arrSize), // 6
    //     randomstringArr(8, arrSize), // 7
    //     randomstringArr(9, arrSize), // 8
    //     randomstringArr(10, arrSize), // 9
    // ];
    // data.push(randomMixedStringArr(arrSize, 1, 32)); // add one mixed-length block // 10

    // const data = [];
    // for (let i = 4; i <= 32; i+=4) {
    //     data.push(randomstringArr(i, arrSize)); // keeps uniform blocks
    // }
    // data.push(randomMixedStringArr(arrSize, 1, 16)); // add one mixed-length block // 8
    // data.push(randomMixedStringArr(arrSize, 1, 32)); // add one mixed-length block // 9



    // const data = [];
    // for (let i = 4; i <= 32; i+=4) {
    //     data.push(randomMixedStringArr(arrSize, 1, i)); // add one mixed-length block //
    // }



    const data = [
        // randomstringArr(4, arrSize),
        // randomstringArr(8, arrSize),
        // randomstringArr(16, arrSize),
        // randomstringArr(32, arrSize),
        // randomstringArr(64, arrSize),
        randomstringArr(128, arrSize),
        randomstringArr(256, arrSize),
        // randomstringArr(512, arrSize),
        // randomstringArr(1024, arrSize),
    ];

    fs.writeFileSync(dataStr, JSON.stringify(data));
}

const data = JSON.parse(fs.readFileSync(dataStr, "utf8"));

// BENCHMARKS
// for (let i = 0; i < 9; i++) {
for (let i = 0; i < data.length; i++) {

    const datapick = data[i];

    // if (process.argv[2] !== "no") {
    //   suite
    //     .add(`${i} - js-levenshtein            `, () => {
    //       for (let j = 0; j < arrSize - 1; j += 2) {
    //         jslevenshtein(datapick[j], datapick[j + 1]);
    //       }
    //     })
    //     .add(`${i} - leven                      `, () => {
    //       for (let j = 0; j < arrSize - 1; j += 2) {
    //         leven(datapick[j], datapick[j + 1]);
    //       }
    //     })
    //     .add(`${i} - fast-levenshtein           `, () => {
    //       for (let j = 0; j < arrSize - 1; j += 2) {
    //         fastLevenshtein(datapick[j], datapick[j + 1]);
    //       }
    //     })
    //     .add(`${i} - levenshtein-edit-distance   `, () => {
    //       for (let j = 0; j < arrSize - 1; j += 2) {
    //         levenshteinEditDistance(datapick[j], datapick[j + 1]);
    //       }
    //     });
    // }

    suite.add(`${i} - fastest-levenshtein        `, () => {
        for (let j = 0; j < arrSize - 1; j += 2) {
            distFast(datapick[j], datapick[j + 1]);
        }
    });
    suite.add(`${i} - lightning-Levenshtein       `, () => {
        for (let j = 0; j < arrSize - 1; j += 2) {
            distance(datapick[j], datapick[j + 1]);
        }
    });
    // suite.add(`${i} - lightning-Levenshtein-d10   `, () => {
    //     for (let j = 0; j < arrSize - 1; j += 2) {
    //         distanceMax(datapick[j], datapick[j + 1], 10);
    //     }
    // });

    // suite.add(`${i} - lightning-Unrolled_32  `, () => {
    //     for (let j = 0; j < arrSize - 1; j += 2) {
    //         myers32_fast(datapick[j], datapick[j + 1]);
    //     }
    // });

    // suite.add(`${i} - lightning-Unrolled_B  `, () => {
    //     for (let j = 0; j < arrSize - 1; j += 2) {
    //         myers32_unrolledB(datapick[j], datapick[j + 1]);
    //     }
    // });

    suite.add(`${i} - lightning-v2-dispatch   `, () => {
        for (let j = 0; j < arrSize - 1; j += 2) {
            levenshteinLightning(datapick[j], datapick[j + 1]);
        }
    });


    suite.add(`${i} - myers_x_old_v2   `, () => {
        for (let j = 0; j < arrSize - 1; j += 2) {
            myers_x_old_v2(datapick[j], datapick[j + 1], datapick[j].length, datapick[j + 1].length);
        }
    });

    
    


}

const results = new Map();
suite
    .on("cycle", (event) => {
        console.log(String(event.target));
        if (results.has(event.target.name[0])) {
            results.get(event.target.name[0]).push(event.target.hz);
        } else {
            results.set(event.target.name[0], [event.target.hz]);
        }
    })
    .on("complete", () => {
        console.log(results);
    })
    // run async
    .run({ async: false });
