const { v4: uuidv4 } = require("uuid")
const { request, response } = require("express");
const express = require("express");
const app = express();
const costumers = [];

app.use(express.json());

function verifyIfExistsAccountCPF (request, response, next) { //Midleware de verificação da existência do usuário
    const { cpf } = request.headers; //Destructuring dos header que estão sendo enviados na requisição
    const costumer = costumers.find((costumerProcurado) => costumerProcurado.cpf === cpf );
 
    if (!costumer) {  //Se Não-Costumer, execute isso.
        return response.status(400).json({ error: "Costumer not found"});
}
    request.costumer = costumer; //Como inserir informações dentro do request para serem recuperadas depois
    return next(); //Tudo certo? Então autoriza prosseguir com Next()
 
}

function getBalance (statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === "credit") {
            return acc + operation.amount
        }
        else {
            return acc - operation.amount
        }
    }, 0)

    return balance
}

app.post("/account", (request, response)=>{  //Criação de Usuários
    const { cpf , name } = request.body;  //As chaves significamque faremos um destructurim
    
    const costumerAlreadyExist =  costumers.some(
        (costumer)=> costumer.cpf === cpf
    );
    if (costumerAlreadyExist) {return response.status(400).json("O Usuário já cadastrado.")}

        costumers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    })
    return response.status(201).send();
})

//Chamo o Middleware ANTES pra travar caso não atenda o requisito. Pode ter mais de um Middleware.
app.get("/statement", verifyIfExistsAccountCPF, (request, response)=>{ //Recupera o Statement
    const {costumer} = request;
    return response.json(costumer.statement);
})

app.post("/deposit", verifyIfExistsAccountCPF, (request, response)=>{ //Deposito
    const { description, amount } = request.body; //Eu preciso pegar do request as informações
    const { costumer } = request; //E preciso recuperar também que é o usuário
    const statementOperation = { //depois faço isso virar uma variável
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    };

    costumer.statement.push(statementOperation); //adicionando por PUSH as informações solicitadas
    return response.status(201).send(); //Retornando pro sistema o status do que aconteceu

})

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response)=>{ //Saque
const { description, amount } = request.body; //Primeiro eu recebo da requisição os dados que estão sendo passados
const { costumer } = request; //Essas informações do costumer estão vindo do Middleware, por isso NÃO tem o BODY.

const balance = getBalance(costumer.statement);

if (balance < amount) {
    return response.status(400).json({error: "Você não tem saldo"})
}
const statementOperation = { //depois faço isso virar uma variável
    amount,
    created_at: new Date(),
    type: "debit"
};

costumer.statement.push(statementOperation); //adicionando por PUSH as informações solicitadas
return response.status(201).send(); 


})

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response)=>{ //Buscar movimentações por data
    const {costumer} = request;
    const {date} = request.query;

    const dateFormat = new Date(date + " 00:00"); //Hack pra pegar as movimentações de qualquer hora

    const statement = costumer.statement.filter((statement) => 
    statement.created_at.toDateString() === 
    new Date(dateFormat).toDateString()
);

    return response.json(statement);
})



//O Listen vai o final de tudo
app.listen(3333);