const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const conexao = require('./dbconfig');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const pastaUploads = path.join(__dirname, 'uploads');

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads);
}

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(pastaUploads));

const armazenamento = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },

    filename: (req, file, cb) => {
        const nomeArquivo =
            Date.now() + '-' + Math.round(Math.random() * 1000000);

        cb(null, nomeArquivo + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: armazenamento,
    limits: {
        files: 5,
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Envie somente arquivos de imagem.'));
        }
    }
});

app.post('/usuarios', async (req, res) => {
    const {nome, email, senha, tipo_usuario} = req.body;

    const sql = `INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES (?, ?, ?, ?)`;

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    console.log("teste")
    conexao.query(
        sql,
        [nome, email, senhaCriptografada, tipo_usuario],
        (erro, resultado) => {
            if (erro) {
                console.log(erro)
                return res.status(500).json({
                    mensagem: 'Erro ao cadastrar usuário',
                });
            }
            res.json({
                mensagem: 'Usuário cadastrado com sucesso',
            });
        }
    )
});


app.get('/usuarios', (req, res) => {
    const sql = "SELECT * FROM usuarios";

    conexao.query(sql, (erro, resultado) => {
        if (erro) {
            console.log(erro)
            return res.status(500).json({
                mensagem: 'Erro ao buscar usuários',
            });
        }
        res.json(resultado);
    })
});


app.post('/login', (req, res) => {
    const {email, senha} = req.body;

    const query = `SELECT * FROM usuarios WHERE email = ?`;
    
    conexao.query(query, [email], async (erro, resultado) => {
        if (erro) {
            console.log(erro);
            return res.status(500).json({
                mensagem: 'Erro ao buscar usuário',
            });
        }

        const usuario = resultado[0];

        const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

        if(senhaCorreta){
            return res.json({
                sucesso: true,
                mensagem: 'Login bem-sucedido',
                data: usuario
            });
        }
    });
}); 


app.post('/roupas', upload.array('fotos', 5), (req, res) => {
    const {
        id_usuario, titulo, descricao, categoria, tamanho,
        cor, material, condicao, preco, tipo_oferta
    } = req.body;

    if (!id_usuario || !titulo || !categoria || !tipo_oferta) {
        return res.status(400).json({ mensagem: 'Preencha os campos obrigatórios.' });
    }

    if (tipo_oferta === 'venda' && (!preco || isNaN(Number(preco)))) {
        return res.status(400).json({ mensagem: 'Informe um preço válido para venda.' });
    }

    const fotos = req.files || [];
    const primeiraFoto = fotos.length > 0 ? fotos[0].filename : null;

    const sql = `
        INSERT INTO Roupas
        (id_usuario, titulo, descricao, categoria, tamanho, cor, material,
         condicao, preco, tipo_oferta, foto, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponivel')
    `;

    conexao.query(
        sql,
        [
            id_usuario,
            titulo,
            descricao || null,
            categoria,
            tamanho || null,
            cor || null,
            material || null,
            condicao || null,
            tipo_oferta === 'venda' ? Number(preco) : null,
            tipo_oferta,
            primeiraFoto
        ],
        (erro, resultado) => {
            if (erro) {
                console.log(erro);
                return res.status(500).json({ mensagem: 'Erro ao cadastrar roupa.' });
            }

            const id_roupa = resultado.insertId;

            if (fotos.length === 0) {
                return res.json({ sucesso: true, mensagem: 'Roupa cadastrada com sucesso!', id_roupa });
            }

            const valores = fotos.map((f) => [id_roupa, f.filename]);

            conexao.query(
                'INSERT INTO Fotos_Roupas (id_roupa, caminho_foto) VALUES ?',
                [valores],
                (erroFotos) => {
                    if (erroFotos) {
                        console.log(erroFotos);
                        return res.status(500).json({
                            mensagem: 'Roupa cadastrada, mas houve erro ao salvar as fotos.'
                        });
                    }
                    res.json({ sucesso: true, mensagem: 'Roupa cadastrada com sucesso!', id_roupa });
                }
            );
        }
    );
});

app.get('/roupas', (req, res) => {
    const sql = `
        SELECT r.id_roupa, r.titulo, r.descricao, r.categoria, r.tamanho, r.cor,
               r.material, r.condicao, r.preco, r.tipo_oferta, r.foto,
               r.data_postagem, u.nome AS nome_usuario
        FROM Roupas r
        JOIN Usuarios u ON u.id_usuario = r.id_usuario
        WHERE r.status = 'disponivel'
        ORDER BY r.data_postagem DESC
    `;

    conexao.query(sql, (erro, resultado) => {
        if (erro) {
            console.log(erro);
            return res.status(500).json({ mensagem: 'Erro ao buscar roupas.' });
        }
        res.json(resultado);
    });
});

app.use((erro, req, res, next) => {
    console.log(erro);
    res.status(400).json({ mensagem: erro.message || 'Erro no envio.' });
});


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});