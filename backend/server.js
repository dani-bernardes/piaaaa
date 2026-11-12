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
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Informe o email e a senha.'
        });
    }

    const query = 'SELECT * FROM usuarios WHERE email = ?';

    conexao.query(query, [email], async (erro, resultado) => {
        if (erro) {
            console.log(erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao buscar usuário.'
            });
        }

        if (resultado.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado.'
            });
        }

        const usuario = resultado[0];

        try {
            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Senha incorreta.'
                });
            }

            return res.json({
                sucesso: true,
                mensagem: 'Login bem-sucedido',
                data: {
                    id_usuario: usuario.id_usuario,
                    nome: usuario.nome,
                    email: usuario.email,
                    tipo_usuario: usuario.tipo_usuario
                }
            });

        } catch (erro) {
            console.log(erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao verificar a senha.'
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


const db = conexao.promise();

function apagarArquivo(nome) {
    if (!nome) return;
    fs.unlink(path.join(pastaUploads, nome), () => {});
}

const CAMPOS_USUARIO =
    'id_usuario, nome, email, tipo_usuario, foto_perfil';

app.get('/usuarios/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ${CAMPOS_USUARIO} FROM Usuarios WHERE id_usuario = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        res.json(rows[0]);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar usuário.' });
    }
});

app.put('/usuarios/:id', async (req, res) => {
    const { nome, email } = req.body;

    if (!nome || !nome.trim() || !email || !email.trim()) {
        return res.status(400).json({ mensagem: 'Preencha nome e email.' });
    }

    try {
        await db.query(
            'UPDATE Usuarios SET nome = ?, email = ? WHERE id_usuario = ?',
            [nome.trim(), email.trim(), req.params.id]
        );

        const [rows] = await db.query(
            `SELECT ${CAMPOS_USUARIO} FROM Usuarios WHERE id_usuario = ?`,
            [req.params.id]
        );

        res.json({ sucesso: true, mensagem: 'Perfil atualizado!', data: rows[0] });
    } catch (e) {
        console.log(e);
        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensagem: 'Este email já está em uso.' });
        }
        res.status(500).json({ mensagem: 'Erro ao atualizar perfil.' });
    }
});

app.post('/usuarios/:id/foto', upload.single('foto'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ mensagem: 'Envie uma imagem.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT foto_perfil FROM Usuarios WHERE id_usuario = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            apagarArquivo(req.file.filename);
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        await db.query(
            'UPDATE Usuarios SET foto_perfil = ? WHERE id_usuario = ?',
            [req.file.filename, req.params.id]
        );

        apagarArquivo(rows[0].foto_perfil); // remove a foto antiga

        res.json({ sucesso: true, foto: req.file.filename });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao salvar a foto.' });
    }
});

app.get('/usuarios/:id/resumo', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT tipo_oferta, status, COUNT(*) AS total
             FROM Roupas
             WHERE id_usuario = ?
             GROUP BY tipo_oferta, status`,
            [req.params.id]
        );

        const resumo = { trocas: 0, vendas: 0, doacoes: 0, publicadas: 0 };

        rows.forEach((r) => {
            const total = Number(r.total);
            resumo.publicadas += total;

            if (r.status === 'finalizado') {
                if (r.tipo_oferta === 'troca') resumo.trocas += total;
                if (r.tipo_oferta === 'venda') resumo.vendas += total;
                if (r.tipo_oferta === 'doacao') resumo.doacoes += total;
            }
        });

        res.json(resumo);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar resumo.' });
    }
});

// roupas publicadas pelo usuário
app.get('/usuarios/:id/roupas', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id_roupa, titulo, tipo_oferta, preco, status, foto
             FROM Roupas
             WHERE id_usuario = ?
             ORDER BY data_postagem DESC`,
            [req.params.id]
        );

        res.json(rows);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar roupas.' });
    }
});

// marcar roupa como concluída (trocada / vendida / doada)
app.patch('/roupas/:id/status', async (req, res) => {
    const { id_usuario, status } = req.body;

    if (!['disponivel', 'reservado', 'finalizado'].includes(status)) {
        return res.status(400).json({ mensagem: 'Status inválido.' });
    }

    try {
        const [resultado] = await db.query(
            'UPDATE Roupas SET status = ? WHERE id_roupa = ? AND id_usuario = ?',
            [status, req.params.id, id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Roupa não encontrada.' });
        }

        res.json({ sucesso: true, mensagem: 'Status atualizado!' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao atualizar status.' });
    }
});

// excluir conta (pede a senha e apaga tudo do usuário)
app.delete('/usuarios/:id', async (req, res) => {
    const id = req.params.id;
    const { senha } = req.body;

    if (!senha) {
        return res.status(400).json({ mensagem: 'Informe sua senha.' });
    }

    let transacaoAberta = false;

    try {
        const [usuarios] = await db.query(
            'SELECT senha, foto_perfil FROM Usuarios WHERE id_usuario = ?',
            [id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        const senhaCorreta = await bcrypt.compare(senha, usuarios[0].senha);

        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Senha incorreta.' });
        }

        // arquivos que serão apagados do disco depois
        const [fotosCapa] = await db.query(
            'SELECT foto FROM Roupas WHERE id_usuario = ?', [id]
        );
        const [fotosExtras] = await db.query(
            `SELECT fr.caminho_foto
             FROM Fotos_Roupas fr
             JOIN Roupas r ON r.id_roupa = fr.id_roupa
             WHERE r.id_usuario = ?`,
            [id]
        );

        const minhas = '(SELECT id_roupa FROM Roupas WHERE id_usuario = ?)';

        await db.beginTransaction();
        transacaoAberta = true;

        await db.query(
            `DELETE FROM Avaliacoes WHERE id_usuario = ? OR id_roupa IN ${minhas}`,
            [id, id]
        );
        await db.query(
            `DELETE FROM Trocas
             WHERE id_usuario_oferece = ? OR id_usuario_recebe = ?
                OR id_roupa IN ${minhas}`,
            [id, id, id]
        );
        await db.query(
            `DELETE FROM Transacoes
             WHERE id_usuario_comprador = ? OR id_roupa IN ${minhas}`,
            [id, id]
        );
        await db.query(
            `DELETE FROM Roupas_Tags WHERE id_roupa IN ${minhas}`,
            [id]
        );
        await db.query('DELETE FROM Dicas WHERE id_usuario = ?', [id]);
        await db.query('DELETE FROM Roupas WHERE id_usuario = ?', [id]); // Fotos_Roupas apaga junto (CASCADE)
        await db.query('DELETE FROM Usuarios WHERE id_usuario = ?', [id]);

        await db.commit();
        transacaoAberta = false;

        // limpa as imagens do disco
        apagarArquivo(usuarios[0].foto_perfil);
        fotosCapa.forEach((f) => apagarArquivo(f.foto));
        fotosExtras.forEach((f) => apagarArquivo(f.caminho_foto));

        res.json({ sucesso: true, mensagem: 'Conta excluída com sucesso.' });
    } catch (e) {
        console.log(e);

        if (transacaoAberta) {
            try { await db.rollback(); } catch (erroRollback) { console.log(erroRollback); }
        }

        res.status(500).json({ mensagem: 'Erro ao excluir a conta.' });
    }
});

 
app.get('/roupas/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.*, u.nome AS nome_usuario, u.foto_perfil AS foto_usuario
             FROM Roupas r
             JOIN Usuarios u ON u.id_usuario = r.id_usuario
             WHERE r.id_roupa = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Peça não encontrada.' });
        }

        const roupa = rows[0];

        const [fotos] = await db.query(
            'SELECT caminho_foto FROM Fotos_Roupas WHERE id_roupa = ? ORDER BY id_foto',
            [req.params.id]
        );

        roupa.fotos = fotos.map((f) => f.caminho_foto);

        if (roupa.fotos.length === 0 && roupa.foto) {
            roupa.fotos = [roupa.foto];
        }

        res.json(roupa);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar a peça.' });
    }
});

async function buscarConversa(idConversa, idUsuario) {
    const [rows] = await db.query(
        `SELECT c.id_conversa, c.id_roupa, c.id_usuario_dono, c.id_usuario_interessado,
                r.titulo, r.foto, r.tipo_oferta,
                o.nome AS nome_dono, i.nome AS nome_interessado
         FROM Conversas c
         JOIN Roupas r ON r.id_roupa = c.id_roupa
         JOIN Usuarios o ON o.id_usuario = c.id_usuario_dono
         JOIN Usuarios i ON i.id_usuario = c.id_usuario_interessado
         WHERE c.id_conversa = ?
           AND (c.id_usuario_dono = ? OR c.id_usuario_interessado = ?)`,
        [idConversa, idUsuario, idUsuario]
    );

    return rows[0] || null;
}

// ---------- abrir (ou continuar) uma conversa sobre uma roupa ----------
app.post('/conversas', async (req, res) => {
    const { id_roupa, id_usuario } = req.body;

    if (!id_roupa || !id_usuario) {
        return res.status(400).json({ mensagem: 'Dados incompletos.' });
    }

    try {
        const [roupas] = await db.query(
            'SELECT id_usuario FROM Roupas WHERE id_roupa = ?',
            [id_roupa]
        );

        if (roupas.length === 0) {
            return res.status(404).json({ mensagem: 'Peça não encontrada.' });
        }

        const idDono = roupas[0].id_usuario;

        if (Number(idDono) === Number(id_usuario)) {
            return res.status(400).json({ mensagem: 'Esta peça é sua.' });
        }

        await db.query(
            `INSERT IGNORE INTO Conversas
             (id_roupa, id_usuario_interessado, id_usuario_dono)
             VALUES (?, ?, ?)`,
            [id_roupa, id_usuario, idDono]
        );

        const [conversas] = await db.query(
            `SELECT id_conversa FROM Conversas
             WHERE id_roupa = ? AND id_usuario_interessado = ?`,
            [id_roupa, id_usuario]
        );

        res.json({ sucesso: true, id_conversa: conversas[0].id_conversa });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao abrir a conversa.' });
    }
});

app.get('/conversas/:id/mensagens', async (req, res) => {
    const idUsuario = req.query.id_usuario;

    if (!idUsuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const conversa = await buscarConversa(req.params.id, idUsuario);

        if (!conversa) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        const [mensagens] = await db.query(
            `SELECT id_mensagem, id_remetente, texto, data_envio
             FROM Mensagens
             WHERE id_conversa = ?
             ORDER BY id_mensagem`,
            [req.params.id]
        );

        const souDono = Number(conversa.id_usuario_dono) === Number(idUsuario);

        res.json({
            conversa: {
                id_conversa: conversa.id_conversa,
                id_roupa: conversa.id_roupa,
                titulo: conversa.titulo,
                foto: conversa.foto,
                tipo_oferta: conversa.tipo_oferta,
                outro_nome: souDono ? conversa.nome_interessado : conversa.nome_dono,
            },
            mensagens,
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar mensagens.' });
    }
});

app.post('/conversas/:id/mensagens', async (req, res) => {
    const { id_usuario, texto } = req.body;

    if (!id_usuario || !texto || !texto.trim()) {
        return res.status(400).json({ mensagem: 'Digite uma mensagem.' });
    }

    if (texto.length > 1000) {
        return res.status(400).json({ mensagem: 'Mensagem muito longa (máx. 1000 caracteres).' });
    }

    try {
        const conversa = await buscarConversa(req.params.id, id_usuario);

        if (!conversa) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        const [resultado] = await db.query(
            'INSERT INTO Mensagens (id_conversa, id_remetente, texto) VALUES (?, ?, ?)',
            [req.params.id, id_usuario, texto.trim()]
        );

        res.json({ sucesso: true, id_mensagem: resultado.insertId });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao enviar a mensagem.' });
    }
});

app.get('/usuarios/:id/conversas', async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await db.query(
            `SELECT c.id_conversa, r.titulo, r.foto, r.tipo_oferta,
                    IF(c.id_usuario_dono = ?, i.nome, o.nome) AS outro_nome,
                    (SELECT m.texto FROM Mensagens m
                      WHERE m.id_conversa = c.id_conversa
                      ORDER BY m.id_mensagem DESC LIMIT 1) AS ultima_mensagem,
                    (SELECT m.data_envio FROM Mensagens m
                      WHERE m.id_conversa = c.id_conversa
                      ORDER BY m.id_mensagem DESC LIMIT 1) AS ultima_data
             FROM Conversas c
             JOIN Roupas r ON r.id_roupa = c.id_roupa
             JOIN Usuarios o ON o.id_usuario = c.id_usuario_dono
             JOIN Usuarios i ON i.id_usuario = c.id_usuario_interessado
             WHERE c.id_usuario_dono = ? OR c.id_usuario_interessado = ?
             ORDER BY COALESCE(ultima_data, c.data_criacao) DESC`,
            [id, id, id]
        );

        res.json(rows);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar conversas.' });
    }
});

app.post('/carrinho', async (req, res) => {
    const { id_usuario, id_roupa } = req.body;

    if (!id_usuario || !id_roupa) {
        return res.status(400).json({ mensagem: 'Dados incompletos.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, tipo_oferta, status FROM Roupas WHERE id_roupa = ?',
            [id_roupa]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Peça não encontrada.' });
        }

        const roupa = rows[0];

        if (Number(roupa.id_usuario) === Number(id_usuario)) {
            return res.status(400).json({ mensagem: 'Esta peça é sua.' });
        }

        if (roupa.tipo_oferta !== 'venda') {
            return res.status(400).json({ mensagem: 'Só peças à venda vão para o carrinho.' });
        }

        if (roupa.status !== 'disponivel') {
            return res.status(400).json({ mensagem: 'Esta peça não está mais disponível.' });
        }

        const [resultado] = await db.query(
            'INSERT IGNORE INTO Carrinho (id_usuario, id_roupa) VALUES (?, ?)',
            [id_usuario, id_roupa]
        );

        res.json({ sucesso: true, jaEstava: resultado.affectedRows === 0 });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao adicionar ao carrinho.' });
    }
});

app.get('/usuarios/:id/carrinho', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.id_roupa, r.titulo, r.preco, r.foto, r.status,
                    u.nome AS nome_vendedor
             FROM Carrinho c
             JOIN Roupas r ON r.id_roupa = c.id_roupa
             JOIN Usuarios u ON u.id_usuario = r.id_usuario
             WHERE c.id_usuario = ?
             ORDER BY c.data_adicao DESC`,
            [req.params.id]
        );

        res.json(rows);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar o carrinho.' });
    }
});

app.delete('/carrinho/:id_usuario/:id_roupa', async (req, res) => {
    try {
        await db.query(
            'DELETE FROM Carrinho WHERE id_usuario = ? AND id_roupa = ?',
            [req.params.id_usuario, req.params.id_roupa]
        );

        res.json({ sucesso: true });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao remover do carrinho.' });
    }
});


app.post('/carrinho/finalizar', async (req, res) => {
    const { id_usuario } = req.body;

    if (!id_usuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const [itens] = await db.query(
            `SELECT r.id_roupa, r.titulo, r.id_usuario AS id_vendedor
             FROM Carrinho c
             JOIN Roupas r ON r.id_roupa = c.id_roupa
             WHERE c.id_usuario = ?`,
            [id_usuario]
        );

        if (itens.length === 0) {
            return res.status(400).json({ mensagem: 'Seu carrinho está vazio.' });
        }

        let reservadas = 0;
        let indisponiveis = 0;

        for (const item of itens) {
            // só reserva se ainda estiver disponível (evita dois compradores na mesma peça)
            const [atualizacao] = await db.query(
                "UPDATE Roupas SET status = 'reservado' WHERE id_roupa = ? AND status = 'disponivel'",
                [item.id_roupa]
            );

            if (atualizacao.affectedRows === 0) {
                indisponiveis++;
                continue;
            }

            reservadas++;

            // abre a conversa com o vendedor e manda o aviso
            await db.query(
                `INSERT IGNORE INTO Conversas
                 (id_roupa, id_usuario_interessado, id_usuario_dono)
                 VALUES (?, ?, ?)`,
                [item.id_roupa, id_usuario, item.id_vendedor]
            );

            const [conversas] = await db.query(
                `SELECT id_conversa FROM Conversas
                 WHERE id_roupa = ? AND id_usuario_interessado = ?`,
                [item.id_roupa, id_usuario]
            );

            await db.query(
                'INSERT INTO Mensagens (id_conversa, id_remetente, texto) VALUES (?, ?, ?)',
                [
                    conversas[0].id_conversa,
                    id_usuario,
                    `Olá! Reservei "${item.titulo}" pelo carrinho. Vamos combinar o pagamento e a entrega?`,
                ]
            );

            await db.query(
                'DELETE FROM Carrinho WHERE id_usuario = ? AND id_roupa = ?',
                [id_usuario, item.id_roupa]
            );
        }

        res.json({ sucesso: true, reservadas, indisponiveis });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao finalizar o pedido.' });
    }
});




app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});