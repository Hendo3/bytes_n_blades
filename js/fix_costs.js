const fs = require('fs');
const path = './data/cyberwares.json';

function adjustCost(obj) {
    if (Array.isArray(obj)) {
        obj.forEach(adjustCost);
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (key === 'cost') {
                if (typeof obj[key] === 'number') {
                    obj[key] = obj[key].toFixed(1);
                }
                else if (typeof obj[key] === 'string') {
                    // Se o valor for uma string que não termina com .00, converte para número e depois para string com .00
                    const valor = parseFloat(obj[key]);
                    if (!isNaN(valor)) {
                        obj[key] = valor.toFixed(1);
                    } else {
                        // Se não for um número válido, tenta converter para float e depois para string com .00
                        const valorFloat = parseFloat(obj[key].replace(/[^0-9.-]+/g, ''));
                        if (!isNaN(valorFloat)) {
                            obj[key] = valorFloat.toFixed(1);
                        } else {
                            console.log(`Valor inválido encontrado em ${key}: ${obj[key]}`);
                        }
                }
    
                }
            } else if (typeof obj[key] === 'object') {
                adjustCost(obj[key]);
            }
        }
    }
}

function verifyCost(obj, caminho = []) {
    let erros = [];
    if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
            erros = erros.concat(verifyCost(item, caminho.concat(`[${idx}]`)));
        });
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
            if (key === 'cost') {
                const valor = obj[key];
                // Aceita string terminando com .0, ou contendo caracteres especiais, ou string vazia
                if (typeof valor === 'number' || (typeof valor === 'string' && !/^\d+(\.\d)?0$/.test(valor) && !/[^\d.]/.test(valor))) {
                    erros.push({ caminho: caminho.concat([key]).join('.'), valor });
                }
            } else {
                erros = erros.concat(verifyCost(obj[key], caminho.concat([key])));
            }
        }
    }
    return erros;
}

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const erros = verifyCost(data);
console.log('Cost errors found:', erros);
adjustCost(data);
fs.writeFileSync(path, JSON.stringify(data, null, 4));
console.log('Numeric cost fields converted to string in the format xxxx.0');