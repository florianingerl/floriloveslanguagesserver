let i = 5;
let s : String = `Il valore di i e ${i}`;

let ezquiel = {
    eta : 50,
    nome : "Ezquiel"
};

let flori = {
    ...ezquiel,
    nome: "Flori"
};

console.log(flori);

console.log(s);