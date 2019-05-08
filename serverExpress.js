'use strict'
const express = require('express');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const cors = require('cors');

let corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(log);

let productos = JSON.parse(fs.readFileSync('productos.json'));
let usuarios = JSON.parse(fs.readFileSync('usuarios.json'));
app.use(express.static(__dirname + '/public'));
let jsonParser = bodyParser.json();
app.use(jsonParser);
let lastId = Object.keys(productos).length;

app.route('/api/productos')
    .get((req, res) => {
        if (req.query.marca) {
            let filtrados = productos.filter(pro => pro.marca.toUpperCase().match(req.query.marca.toUpperCase()));
            res.json(filtrados);
            res.status(200).send();
        }
        res.json(productos);
        res.status(201).send();
    })
    .post(validarToken, (req, res) => {
        if (req.body.nombre && req.body.marca && (req.body.precio > 0) && req.body.descripcion && (req.body.existencia >= 0)) {
            let producto = req.body;
            producto.id = lastId++;
            productos.push(producto);
            req.get('x-auth', )
            fs.writeFileSync('productos.json', JSON.stringify(productos));
            res.json(producto);
            res.status(201).send();
            return;
        }
        res.status(400).send({
            error: "Faltan atributos"
        });
    });

app.route('/api/productos/:id?')
    .get(existeId, (req, res) => {
        let id = req.params.id;
        let producto = productos.find(pro => pro.id == id);
        if (producto) {
            res.json(producto);
        } else {
            res.json({
                error: "ID no encontrado"
            });
        }

    })
    .patch(validarToken, existeId, (req, res) => {
        let id = req.params.id;
        if (partialUpdateProducto(id, req.body)) {
            res.send();
        } else {
            res.status(400).send({
                error: "No se encontró ID o faltan datos"
            })
        }
    });

app.route('/api/usuario/login')
    .post(logIn, (req, res) => {
        if (req.body.usuario && req.body.contra.length >= 6) {
            let user = req.body;
            let usuario = usuarios.find(usr => usr.usuario === user.usuario);
            usuario.token = randomToken();
            usuario.timeStamp = Date.now();
            console.log(usuario)

            fs.writeFileSync('usuarios.json', JSON.stringify(usuarios));
            res.set('x-auth', usuario.token);
            res.status(200).send(user.usuario);
            return;
        }
        res.status(401).send({
            error: "Usuario o contraseña incorrectos"
        });
    });

app.route('/api/usuario/logout')
    .post(validarToken, (req, res) => {
        if (req.body.usuario && req.body.contra.length >= 6) {
            let user = req.body;
            let usuario = usuarios.find(usr => usr.usuario === user.usuario);
            usuario.token = '';
            usuario.timeStamp = 0;

            fs.writeFileSync('usuarios.json', JSON.stringify(usuarios));
            res.json(user.usuario);
            res.status(200).send();
            return;
        }
        res.status(400).send();
    });


function existeId(req, res, next) {
    let id = req.params.id;
    let pos = productos.findIndex(pro => pro.id == id);
    if (pos == -1) {
        res.status(404).send({
            error: "Producto no encontrado"
        });
        return;
    }
    next();
}

function partialUpdateProducto(id, producto) {
    const pos = productos.findIndex(pro => pro.id == id);
    if (pos >= 0) {
        console.log(producto);
        productos[pos].nombre = (producto.nombre) ? producto.nombre : producto[pos].nombre;
        productos[pos].marca = (producto.marca) ? producto.marca : productos[pos].marca;
        productos[pos].descripcion = (producto.descripcion) ? producto.descripcion : productos[pos].descripcion;
        productos[pos].precio = (producto.precio) ? (producto.precio >= 0 ? producto.precio : productos[pos].precio) : productos[pos].precio;
        productos[pos].existencia = (producto.existencia && producto.existencia >= 0) ? producto.existencia : productos[pos].existencia;
        fs.writeFileSync('productos.json', JSON.stringify(productos));
        return true;
    }

    return false;
}

function logIn(req, res, next) {
    let usuario = req.body.usuario;
    let contra = req.body.contra;
    let pos = usuarios.findIndex(user => user.usuario === usuario && user.contra === contra);
    if (pos == -1) {
        res.status(404).send({
            error: "Usuario no existe"
        });
    }
    next();
}

function randomToken() {
    return Math.random().toString(36).substring(2, 15);
}

function validarToken(req, res, next) {
    let token = req.get('x-auth');
    console.log(token);
    let user = req.get('x-user');
    console.log(user);
    let pos = usuarios.findIndex(usr => usr.usuario === user);

    console.log(Date.now());
    console.log(usuarios[pos].timeStamp);
    console.log(Date.now() - usuarios[pos].timeStamp);
    if (pos == -1 || !usuarios[pos].token || usuarios[pos].timeStamp == 0 || Date.now() - usuarios[pos].timeStamp > 300000 || usuarios[pos].token != token) {
        res.status(401).send({
            error: "Sesión expirada"
        });
    }
    next();
}

function log(req, res, next) {
    console.log("método: ", req.method);
    console.log("url: ", req.originalUrl);
    console.log("fecha: ", new Date(Date.now()).toString());
    console.log("content-type: ", req.get('Content-Type'));
    console.log("x-auth: ", req.get('x-auth'));
    console.log("request: ", req.body);
    next();

}

app.listen(port, () => console.log(`Example app listening on port ${port}!`));