const fs = require('fs');
const path = './data/equipamentos.json';
const path2 = './data/cromos.json';

function names(obj, path = []) {
    let nomes = [];
    if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
            nomes = nomes.concat(names(item, path.concat(`[${idx}]`)));
        });
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (key === 'name') {
                const valor = obj[key];
                if (typeof valor === 'string') {
                    nomes.push({ path: path.concat([key]).join('.'), valor });
                }
            } else {
                nomes = nomes.concat(names(obj[key], path.concat([key])));
            }
        }
    }
    return nomes;
}


const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const nomes = names(data);
console.log('Name:', nomes);
console.log('Numeric HL fields converted to string.');