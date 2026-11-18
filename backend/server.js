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

// =====================================================
// UTILITÁRIOS COMPARTILHADOS
// =====================================================

const db = conexao.promise();

function apagarArquivo(nome) {
    if (!nome) return;
    fs.unlink(path.join(pastaUploads, nome), () => {});
}

function textoOuNulo(valor) {
    return valor && String(valor).trim() ? String(valor).trim() : null;
}

function numeroOuNulo(valor) {
    if (valor === undefined || valor === null || valor === '') return null;

    const n = Number(valor);
    return isNaN(n) ? null : n;
}

const TIPOS_USUARIO = ['consumidor', 'brecho', 'atelie'];

// campos do usuário que podem ser enviados ao app (nunca a senha).
// DATE_FORMAT evita que a data chegue com fuso horário e mude de dia.
const CAMPOS_USUARIO =
    "id_usuario, nome, email, tipo_usuario, foto_perfil, sexo, " +
    "DATE_FORMAT(data_nascimento, '%Y-%m-%d') AS data_nascimento, cidade, telefone";

// =====================================================
// USUÁRIOS E LOGIN
// =====================================================

app.post('/usuarios', async (req, res) => {
    const { nome, email, senha, tipo_usuario } = req.body;

    if (!nome || !String(nome).trim() || !email || !String(email).trim() || !senha) {
        return res.status(400).json({ mensagem: 'Preencha nome, email e senha.' });
    }

    const tipo = tipo_usuario || 'consumidor';

    if (!TIPOS_USUARIO.includes(tipo)) {
        return res.status(400).json({ mensagem: 'Tipo de usuário inválido.' });
    }

    try {
        const senhaCriptografada = await bcrypt.hash(String(senha), 10);

        await db.query(
            'INSERT INTO Usuarios (nome, email, senha, tipo_usuario) VALUES (?, ?, ?, ?)',
            [String(nome).trim(), String(email).trim(), senhaCriptografada, tipo]
        );

        res.json({ sucesso: true, mensagem: 'Usuário cadastrado com sucesso' });
    } catch (e) {
        console.log(e);

        if (e.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensagem: 'Este email já está em uso.' });
        }

        res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
});

app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT ${CAMPOS_USUARIO} FROM Usuarios`);
        res.json(rows);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar usuários' });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            sucesso: false,
            mensagem: 'Informe o email e a senha.'
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT senha, ${CAMPOS_USUARIO} FROM Usuarios WHERE email = ?`,
            [String(email).trim()]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado.'
            });
        }

        const { senha: senhaGuardada, ...usuario } = rows[0];

        const senhaCorreta = await bcrypt.compare(String(senha), senhaGuardada);

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Senha incorreta.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Login bem-sucedido',
            data: usuario
        });
    } catch (e) {
        console.log(e);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao fazer login.'
        });
    }
});

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
    const { nome, email, sexo, data_nascimento, cidade, telefone } = req.body;

    if (!nome || !nome.trim() || !email || !email.trim()) {
        return res.status(400).json({ mensagem: 'Preencha nome e email.' });
    }

    if (sexo && !['M', 'F', 'O'].includes(sexo)) {
        return res.status(400).json({ mensagem: 'Sexo inválido.' });
    }

    let nascimento = null;

    if (data_nascimento && String(data_nascimento).trim()) {
        nascimento = String(data_nascimento).trim();
        const data = new Date(`${nascimento}T00:00:00`);

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(nascimento) ||
            isNaN(data.getTime()) ||
            data > new Date()
        ) {
            return res.status(400).json({ mensagem: 'Data de nascimento inválida.' });
        }
    }

    if (cidade && cidade.length > 100) {
        return res.status(400).json({ mensagem: 'Cidade muito longa.' });
    }

    if (telefone && telefone.length > 20) {
        return res.status(400).json({ mensagem: 'Telefone muito longo.' });
    }

    try {
        await db.query(
            `UPDATE Usuarios
             SET nome = ?, email = ?, sexo = ?, data_nascimento = ?, cidade = ?, telefone = ?
             WHERE id_usuario = ?`,
            [
                nome.trim(),
                email.trim(),
                sexo || null,
                nascimento,
                textoOuNulo(cidade),
                textoOuNulo(telefone),
                req.params.id
            ]
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

        // arquivos que precisam ser apagados do disco depois da exclusão
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
        const [fotosDicas] = await db.query(
            'SELECT foto FROM Dicas WHERE id_usuario = ?', [id]
        );
        const [logosEstab] = await db.query(
            'SELECT foto_logo FROM Estabelecimentos WHERE id_usuario = ?', [id]
        );

        const minhas = '(SELECT id_roupa FROM Roupas WHERE id_usuario = ?)';
        const meusEstab =
            '(SELECT id_estabelecimento FROM Estabelecimentos WHERE id_usuario = ?)';

        await db.beginTransaction();
        transacaoAberta = true;

        await db.query(
            `DELETE FROM Avaliacoes
             WHERE id_usuario = ?
                OR id_roupa IN ${minhas}
                OR id_estabelecimento IN ${meusEstab}`,
            [id, id, id]
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
        await db.query('DELETE FROM Roupas WHERE id_usuario = ?', [id]);
        // o estabelecimento (se existir) é removido junto, por ON DELETE CASCADE
        await db.query('DELETE FROM Usuarios WHERE id_usuario = ?', [id]);

        await db.commit();
        transacaoAberta = false;

        apagarArquivo(usuarios[0].foto_perfil);
        fotosCapa.forEach((f) => apagarArquivo(f.foto));
        fotosExtras.forEach((f) => apagarArquivo(f.caminho_foto));
        fotosDicas.forEach((f) => apagarArquivo(f.foto));
        logosEstab.forEach((f) => apagarArquivo(f.foto_logo));

        res.json({ sucesso: true, mensagem: 'Conta excluída com sucesso.' });
    } catch (e) {
        console.log(e);

        if (transacaoAberta) {
            try { await db.rollback(); } catch (erroRollback) { console.log(erroRollback); }
        }

        res.status(500).json({ mensagem: 'Erro ao excluir a conta.' });
    }
});

// =====================================================
// ROUPAS
// =====================================================

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

app.put('/roupas/:id', async (req, res) => {
    const {
        id_usuario, titulo, descricao, categoria, tamanho,
        cor, material, condicao, preco, tipo_oferta
    } = req.body;

    if (!id_usuario || !titulo || !titulo.trim() || !categoria) {
        return res.status(400).json({ mensagem: 'Preencha título e categoria.' });
    }

    if (!['troca', 'venda', 'doacao'].includes(tipo_oferta)) {
        return res.status(400).json({ mensagem: 'Tipo de oferta inválido.' });
    }

    if (condicao && !['novo', 'pouco usado', 'usado'].includes(condicao)) {
        return res.status(400).json({ mensagem: 'Condição inválida.' });
    }

    if (
        tipo_oferta === 'venda' &&
        (preco === undefined || preco === null || preco === '' || isNaN(Number(preco)))
    ) {
        return res.status(400).json({ mensagem: 'Informe um preço válido para venda.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, status FROM Roupas WHERE id_roupa = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Anúncio não encontrado.' });
        }

        if (Number(rows[0].id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ mensagem: 'Você só pode editar os seus anúncios.' });
        }

        if (rows[0].status === 'finalizado') {
            return res.status(400).json({ mensagem: 'Anúncio concluído não pode ser editado.' });
        }

        await db.query(
            `UPDATE Roupas
             SET titulo = ?, descricao = ?, categoria = ?, tamanho = ?, cor = ?,
                 material = ?, condicao = ?, preco = ?, tipo_oferta = ?
             WHERE id_roupa = ?`,
            [
                titulo.trim(),
                descricao || null,
                categoria,
                tamanho || null,
                cor || null,
                material || null,
                condicao || null,
                tipo_oferta === 'venda' ? Number(preco) : null,
                tipo_oferta,
                req.params.id
            ]
        );

        if (tipo_oferta !== 'venda') {
            await db.query('DELETE FROM Carrinho WHERE id_roupa = ?', [req.params.id]);
        }

        res.json({ sucesso: true, mensagem: 'Anúncio atualizado!' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao atualizar o anúncio.' });
    }
});

app.delete('/roupas/:id', async (req, res) => {
    const { id_usuario } = req.body;
    const id = req.params.id;

    if (!id_usuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, foto FROM Roupas WHERE id_roupa = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Anúncio não encontrado.' });
        }

        if (Number(rows[0].id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ mensagem: 'Você só pode excluir os seus anúncios.' });
        }

        const [fotosExtras] = await db.query(
            'SELECT caminho_foto FROM Fotos_Roupas WHERE id_roupa = ?',
            [id]
        );

        await db.query('DELETE FROM Avaliacoes WHERE id_roupa = ?', [id]);
        await db.query('DELETE FROM Trocas WHERE id_roupa = ?', [id]);
        await db.query('DELETE FROM Transacoes WHERE id_roupa = ?', [id]);
        await db.query('DELETE FROM Roupas_Tags WHERE id_roupa = ?', [id]);

        await db.query('DELETE FROM Roupas WHERE id_roupa = ?', [id]);

        apagarArquivo(rows[0].foto);
        fotosExtras.forEach((f) => apagarArquivo(f.caminho_foto));

        res.json({ sucesso: true, mensagem: 'Anúncio excluído.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao excluir o anúncio.' });
    }
});

// =====================================================
// CONVERSAS E MENSAGENS
// =====================================================

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

// =====================================================
// CARRINHO
// =====================================================

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
            const [atualizacao] = await db.query(
                "UPDATE Roupas SET status = 'reservado' WHERE id_roupa = ? AND status = 'disponivel'",
                [item.id_roupa]
            );

            if (atualizacao.affectedRows === 0) {
                indisponiveis++;
                continue;
            }

            reservadas++;

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

// =====================================================
// FAVORITOS (roupas)
// =====================================================

app.post('/favoritos/alternar', async (req, res) => {
    const { id_usuario, id_roupa } = req.body;

    if (!id_usuario || !id_roupa) {
        return res.status(400).json({ mensagem: 'Dados incompletos.' });
    }

    try {
        const [removido] = await db.query(
            'DELETE FROM Favoritos WHERE id_usuario = ? AND id_roupa = ?',
            [id_usuario, id_roupa]
        );

        if (removido.affectedRows > 0) {
            return res.json({ sucesso: true, favoritado: false });
        }

        const [roupas] = await db.query(
            'SELECT id_roupa FROM Roupas WHERE id_roupa = ?',
            [id_roupa]
        );

        if (roupas.length === 0) {
            return res.status(404).json({ mensagem: 'Peça não encontrada.' });
        }

        await db.query(
            'INSERT IGNORE INTO Favoritos (id_usuario, id_roupa) VALUES (?, ?)',
            [id_usuario, id_roupa]
        );

        res.json({ sucesso: true, favoritado: true });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao atualizar favoritos.' });
    }
});

app.get('/usuarios/:id/favoritos', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT r.id_roupa, r.titulo, r.preco, r.tipo_oferta, r.foto, r.status
             FROM Favoritos f
             JOIN Roupas r ON r.id_roupa = f.id_roupa
             WHERE f.id_usuario = ?
             ORDER BY f.data_favorito DESC`,
            [req.params.id]
        );

        res.json(rows);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar favoritos.' });
    }
});

// =====================================================
// UPCYCLING (dicas / tutoriais)
// =====================================================

const DIFICULDADES = ['facil', 'medio', 'dificil'];

// converte a lista de passos (vem como texto JSON no FormData)
function lerPassos(valor) {
    try {
        const lista = typeof valor === 'string' ? JSON.parse(valor) : valor;

        if (!Array.isArray(lista)) return [];

        return lista.map((p) => String(p || '').trim()).filter(Boolean);
    } catch (e) {
        return [];
    }
}

function tempoOuNulo(valor) {
    const n = parseInt(valor, 10);
    return n > 0 ? n : null;
}

function validarDica(corpo, passos) {
    if (!corpo.titulo || !corpo.titulo.trim()) return 'Informe o título.';
    if (corpo.titulo.length > 100) return 'O título pode ter no máximo 100 caracteres.';
    if (!corpo.categoria) return 'Escolha uma categoria.';
    if (!DIFICULDADES.includes(corpo.dificuldade)) return 'Escolha a dificuldade.';
    if (passos.length === 0) return 'Adicione pelo menos um passo.';
    return null;
}

app.get('/dicas', async (req, res) => {
    const idUsuario = req.query.id_usuario || 0;

    try {
        const [rows] = await db.query(
            `SELECT d.id_dica, d.id_usuario, d.titulo, d.descricao, d.categoria,
                    d.dificuldade, d.tempo_minutos, d.foto, d.data_postagem,
                    u.nome AS autor,
                    (SELECT COUNT(*) FROM Dicas_Favoritas f
                      WHERE f.id_dica = d.id_dica) AS total_favoritos,
                    EXISTS(SELECT 1 FROM Dicas_Favoritas f
                            WHERE f.id_dica = d.id_dica AND f.id_usuario = ?) AS favorita
             FROM Dicas d
             JOIN Usuarios u ON u.id_usuario = d.id_usuario
             ORDER BY d.data_postagem DESC`,
            [idUsuario]
        );

        res.json(
            rows.map((r) => ({
                ...r,
                total_favoritos: Number(r.total_favoritos),
                favorita: Boolean(Number(r.favorita)),
            }))
        );
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar dicas.' });
    }
});

app.get('/dicas/:id', async (req, res) => {
    const idUsuario = req.query.id_usuario || 0;

    try {
        const [rows] = await db.query(
            `SELECT d.*, u.nome AS autor,
                    (SELECT COUNT(*) FROM Dicas_Favoritas f
                      WHERE f.id_dica = d.id_dica) AS total_favoritos,
                    EXISTS(SELECT 1 FROM Dicas_Favoritas f
                            WHERE f.id_dica = d.id_dica AND f.id_usuario = ?) AS favorita
             FROM Dicas d
             JOIN Usuarios u ON u.id_usuario = d.id_usuario
             WHERE d.id_dica = ?`,
            [idUsuario, req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Dica não encontrada.' });
        }

        const [passos] = await db.query(
            'SELECT ordem, descricao FROM Dicas_Passos WHERE id_dica = ? ORDER BY ordem',
            [req.params.id]
        );

        const dica = rows[0];
        dica.total_favoritos = Number(dica.total_favoritos);
        dica.favorita = Boolean(Number(dica.favorita));
        dica.passos = passos;

        res.json(dica);
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar a dica.' });
    }
});

app.post('/dicas', upload.single('foto'), async (req, res) => {
    const corpo = req.body;
    const passos = lerPassos(corpo.passos);

    const erro = !corpo.id_usuario
        ? 'Usuário não informado.'
        : validarDica(corpo, passos);

    if (erro) {
        if (req.file) apagarArquivo(req.file.filename);
        return res.status(400).json({ mensagem: erro });
    }

    try {
        const [resultado] = await db.query(
            `INSERT INTO Dicas
             (id_usuario, titulo, descricao, categoria, dificuldade,
              tempo_minutos, materiais, ferramentas, foto)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                corpo.id_usuario,
                corpo.titulo.trim(),
                textoOuNulo(corpo.descricao),
                corpo.categoria,
                corpo.dificuldade,
                tempoOuNulo(corpo.tempo_minutos),
                textoOuNulo(corpo.materiais),
                textoOuNulo(corpo.ferramentas),
                req.file ? req.file.filename : null,
            ]
        );

        const idDica = resultado.insertId;

        await db.query(
            'INSERT INTO Dicas_Passos (id_dica, ordem, descricao) VALUES ?',
            [passos.map((p, i) => [idDica, i + 1, p])]
        );

        res.json({ sucesso: true, mensagem: 'Dica publicada!', id_dica: idDica });
    } catch (e) {
        console.log(e);
        if (req.file) apagarArquivo(req.file.filename);
        res.status(500).json({ mensagem: 'Erro ao publicar a dica.' });
    }
});

app.put('/dicas/:id', upload.single('foto'), async (req, res) => {
    const corpo = req.body;
    const passos = lerPassos(corpo.passos);

    const erro = !corpo.id_usuario
        ? 'Usuário não informado.'
        : validarDica(corpo, passos);

    if (erro) {
        if (req.file) apagarArquivo(req.file.filename);
        return res.status(400).json({ mensagem: erro });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, foto FROM Dicas WHERE id_dica = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            if (req.file) apagarArquivo(req.file.filename);
            return res.status(404).json({ mensagem: 'Dica não encontrada.' });
        }

        if (Number(rows[0].id_usuario) !== Number(corpo.id_usuario)) {
            if (req.file) apagarArquivo(req.file.filename);
            return res.status(403).json({ mensagem: 'Você só pode editar as suas dicas.' });
        }

        await db.query(
            `UPDATE Dicas
             SET titulo = ?, descricao = ?, categoria = ?, dificuldade = ?,
                 tempo_minutos = ?, materiais = ?, ferramentas = ?,
                 foto = COALESCE(?, foto)
             WHERE id_dica = ?`,
            [
                corpo.titulo.trim(),
                textoOuNulo(corpo.descricao),
                corpo.categoria,
                corpo.dificuldade,
                tempoOuNulo(corpo.tempo_minutos),
                textoOuNulo(corpo.materiais),
                textoOuNulo(corpo.ferramentas),
                req.file ? req.file.filename : null,
                req.params.id,
            ]
        );

        await db.query('DELETE FROM Dicas_Passos WHERE id_dica = ?', [req.params.id]);
        await db.query(
            'INSERT INTO Dicas_Passos (id_dica, ordem, descricao) VALUES ?',
            [passos.map((p, i) => [req.params.id, i + 1, p])]
        );

        if (req.file) apagarArquivo(rows[0].foto);

        res.json({ sucesso: true, mensagem: 'Dica atualizada!' });
    } catch (e) {
        console.log(e);
        if (req.file) apagarArquivo(req.file.filename);
        res.status(500).json({ mensagem: 'Erro ao atualizar a dica.' });
    }
});

app.delete('/dicas/:id', async (req, res) => {
    const { id_usuario } = req.body;

    if (!id_usuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, foto FROM Dicas WHERE id_dica = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Dica não encontrada.' });
        }

        if (Number(rows[0].id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({ mensagem: 'Você só pode excluir as suas dicas.' });
        }

        await db.query('DELETE FROM Dicas WHERE id_dica = ?', [req.params.id]);

        apagarArquivo(rows[0].foto);

        res.json({ sucesso: true, mensagem: 'Dica excluída.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao excluir a dica.' });
    }
});

app.post('/dicas/:id/favoritar', async (req, res) => {
    const { id_usuario } = req.body;

    if (!id_usuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const [removido] = await db.query(
            'DELETE FROM Dicas_Favoritas WHERE id_usuario = ? AND id_dica = ?',
            [id_usuario, req.params.id]
        );

        if (removido.affectedRows > 0) {
            return res.json({ sucesso: true, favorita: false });
        }

        const [dicas] = await db.query(
            'SELECT id_dica FROM Dicas WHERE id_dica = ?',
            [req.params.id]
        );

        if (dicas.length === 0) {
            return res.status(404).json({ mensagem: 'Dica não encontrada.' });
        }

        await db.query(
            'INSERT IGNORE INTO Dicas_Favoritas (id_usuario, id_dica) VALUES (?, ?)',
            [id_usuario, req.params.id]
        );

        res.json({ sucesso: true, favorita: true });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao atualizar favoritos.' });
    }
});

const TIPOS_CADASTRO = ['brecho', 'atelie'];
const TIPOS_BUSCA = ['brecho', 'atelie', 'feira', 'ponto_coleta'];

function validarEstabelecimento(b) {
    if (!b.nome || !b.nome.trim()) return 'Informe o nome do estabelecimento.';
    if (b.nome.length > 100) return 'O nome pode ter no máximo 100 caracteres.';

    if (!TIPOS_CADASTRO.includes(b.tipo)) return 'Escolha o tipo: brechó ou ateliê.';

    if (!b.endereco || !b.endereco.trim()) return 'Informe o endereço completo.';
    if (b.endereco.length > 255) return 'O endereço está muito longo.';

    if (!b.cidade || !b.cidade.trim()) return 'Informe a cidade.';

    if (!b.estado || !/^[A-Za-z]{2}$/.test(b.estado.trim())) {
        return 'Informe o estado com 2 letras (ex: MG).';
    }

    if (b.telefone && b.telefone.length > 20) return 'Telefone muito longo (máx. 20 caracteres).';
    if (b.email && b.email.length > 100) return 'E-mail muito longo.';
    if (b.site && b.site.length > 100) return 'Site muito longo.';
    if (b.horario_funcionamento && b.horario_funcionamento.length > 255) {
        return 'Horário de funcionamento muito longo.';
    }

    const lat = numeroOuNulo(b.latitude);
    const lng = numeroOuNulo(b.longitude);

    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return 'Escolha a localização no mapa.';
    }

    return null;
}

function formatar(linha) {
    return {
        ...linha,
        latitude: linha.latitude === null ? null : Number(linha.latitude),
        longitude: linha.longitude === null ? null : Number(linha.longitude),
        distancia_km:
            linha.distancia_km === null || linha.distancia_km === undefined
                ? null
                : Number(linha.distancia_km),
    };
}

const CAMPOS_ESTABELECIMENTO = `
    id_estabelecimento, id_usuario, nome, tipo, descricao, endereco, cidade,
    estado, telefone, email, site, horario_funcionamento, foto_logo,
    latitude, longitude
`;

app.get('/estabelecimentos', async (req, res) => {
    const { q, tipo } = req.query;
    const lat = numeroOuNulo(req.query.lat);
    const lng = numeroOuNulo(req.query.lng);
    const raio = numeroOuNulo(req.query.raio);
    const temPosicao = lat !== null && lng !== null;

    const filtros = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
    const parametros = [];

    if (q && q.trim()) {
        filtros.push('nome LIKE ?');
        parametros.push(`%${q.trim()}%`);
    }

    if (tipo && TIPOS_BUSCA.includes(tipo)) {
        filtros.push('tipo = ?');
        parametros.push(tipo);
    }

    const colunaDistancia = temPosicao
        ? `(6371 * ACOS(LEAST(1,
              COS(RADIANS(?)) * COS(RADIANS(latitude)) *
              COS(RADIANS(longitude) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(latitude))
           ))) AS distancia_km`
        : 'NULL AS distancia_km';

    const valoresSelect = temPosicao ? [lat, lng, lat] : [];

    let sql = `SELECT ${CAMPOS_ESTABELECIMENTO}, ${colunaDistancia}
               FROM Estabelecimentos
               WHERE ${filtros.join(' AND ')}`;

    const valores = [...valoresSelect, ...parametros];

    if (temPosicao && raio !== null && raio > 0) {
        sql += ' HAVING distancia_km <= ?';
        valores.push(raio);
    }

    sql += temPosicao ? ' ORDER BY distancia_km' : ' ORDER BY nome';

    try {
        const [rows] = await db.query(sql, valores);
        res.json(rows.map(formatar));
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar estabelecimentos.' });
    }
});

app.get('/usuarios/:id/estabelecimento', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ${CAMPOS_ESTABELECIMENTO}, NULL AS distancia_km
             FROM Estabelecimentos
             WHERE id_usuario = ?`,
            [req.params.id]
        );

        res.json({ estabelecimento: rows.length ? formatar(rows[0]) : null });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar o estabelecimento.' });
    }
});

app.get('/estabelecimentos/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ${CAMPOS_ESTABELECIMENTO}, NULL AS distancia_km
             FROM Estabelecimentos
             WHERE id_estabelecimento = ?`,
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Estabelecimento não encontrado.' });
        }

        res.json(formatar(rows[0]));
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao buscar o estabelecimento.' });
    }
});

app.post('/estabelecimentos', upload.single('foto'), async (req, res) => {
    const b = req.body;

    function descartarFoto() {
        if (req.file) apagarArquivo(req.file.filename);
    }

    if (!b.id_usuario) {
        descartarFoto();
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    const erro = validarEstabelecimento(b);

    if (erro) {
        descartarFoto();
        return res.status(400).json({ mensagem: erro });
    }

    try {
        const [usuarios] = await db.query(
            'SELECT tipo_usuario FROM Usuarios WHERE id_usuario = ?',
            [b.id_usuario]
        );

        if (usuarios.length === 0) {
            descartarFoto();
            return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
        }

        if (!TIPOS_CADASTRO.includes(usuarios[0].tipo_usuario)) {
            descartarFoto();
            return res.status(403).json({
                mensagem: 'Somente contas de brechó ou ateliê podem cadastrar estabelecimentos.',
            });
        }

        const [existente] = await db.query(
            'SELECT id_estabelecimento FROM Estabelecimentos WHERE id_usuario = ?',
            [b.id_usuario]
        );

        if (existente.length > 0) {
            descartarFoto();
            return res.status(409).json({
                mensagem: 'Você já cadastrou o seu estabelecimento. Edite-o em vez de criar outro.',
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO Estabelecimentos
             (id_usuario, nome, tipo, descricao, endereco, cidade, estado,
              telefone, email, site, horario_funcionamento, foto_logo,
              latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                b.id_usuario,
                b.nome.trim(),
                b.tipo,
                textoOuNulo(b.descricao),
                b.endereco.trim(),
                b.cidade.trim(),
                b.estado.trim().toUpperCase(),
                textoOuNulo(b.telefone),
                textoOuNulo(b.email),
                textoOuNulo(b.site),
                textoOuNulo(b.horario_funcionamento),
                req.file ? req.file.filename : null,
                Number(b.latitude),
                Number(b.longitude),
            ]
        );

        res.json({
            sucesso: true,
            mensagem: 'Estabelecimento cadastrado no mapa!',
            id_estabelecimento: resultado.insertId,
        });
    } catch (e) {
        console.log(e);
        descartarFoto();
        res.status(500).json({ mensagem: 'Erro ao cadastrar o estabelecimento.' });
    }
});

app.put('/estabelecimentos/:id', upload.single('foto'), async (req, res) => {
    const b = req.body;

    function descartarFoto() {
        if (req.file) apagarArquivo(req.file.filename);
    }

    if (!b.id_usuario) {
        descartarFoto();
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    const erro = validarEstabelecimento(b);

    if (erro) {
        descartarFoto();
        return res.status(400).json({ mensagem: erro });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, foto_logo FROM Estabelecimentos WHERE id_estabelecimento = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            descartarFoto();
            return res.status(404).json({ mensagem: 'Estabelecimento não encontrado.' });
        }

        if (Number(rows[0].id_usuario) !== Number(b.id_usuario)) {
            descartarFoto();
            return res.status(403).json({
                mensagem: 'Você só pode editar o seu próprio estabelecimento.',
            });
        }

        await db.query(
            `UPDATE Estabelecimentos
             SET nome = ?, tipo = ?, descricao = ?, endereco = ?, cidade = ?,
                 estado = ?, telefone = ?, email = ?, site = ?,
                 horario_funcionamento = ?, latitude = ?, longitude = ?,
                 foto_logo = COALESCE(?, foto_logo)
             WHERE id_estabelecimento = ?`,
            [
                b.nome.trim(),
                b.tipo,
                textoOuNulo(b.descricao),
                b.endereco.trim(),
                b.cidade.trim(),
                b.estado.trim().toUpperCase(),
                textoOuNulo(b.telefone),
                textoOuNulo(b.email),
                textoOuNulo(b.site),
                textoOuNulo(b.horario_funcionamento),
                Number(b.latitude),
                Number(b.longitude),
                req.file ? req.file.filename : null,
                req.params.id,
            ]
        );

        if (req.file) apagarArquivo(rows[0].foto_logo);

        res.json({ sucesso: true, mensagem: 'Estabelecimento atualizado!' });
    } catch (e) {
        console.log(e);
        descartarFoto();
        res.status(500).json({ mensagem: 'Erro ao atualizar o estabelecimento.' });
    }
});

app.delete('/estabelecimentos/:id', async (req, res) => {
    const { id_usuario } = req.body;

    if (!id_usuario) {
        return res.status(400).json({ mensagem: 'Usuário não informado.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT id_usuario, foto_logo FROM Estabelecimentos WHERE id_estabelecimento = ?',
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ mensagem: 'Estabelecimento não encontrado.' });
        }

        if (Number(rows[0].id_usuario) !== Number(id_usuario)) {
            return res.status(403).json({
                mensagem: 'Você só pode excluir o seu próprio estabelecimento.',
            });
        }

        await db.query(
            'DELETE FROM Avaliacoes WHERE id_estabelecimento = ?',
            [req.params.id]
        );

        await db.query(
            'DELETE FROM Estabelecimentos WHERE id_estabelecimento = ?',
            [req.params.id]
        );

        apagarArquivo(rows[0].foto_logo);

        res.json({ sucesso: true, mensagem: 'Estabelecimento removido do mapa.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({ mensagem: 'Erro ao excluir o estabelecimento.' });
    }
});


app.use((erro, req, res, next) => {
    console.log(erro);

    if (erro.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ mensagem: 'A imagem pode ter no máximo 5 MB.' });
    }

    if (erro.code === 'LIMIT_FILE_COUNT' || erro.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ mensagem: 'Quantidade de arquivos não permitida.' });
    }

    res.status(erro.status || 400).json({ mensagem: erro.message || 'Erro no envio.' });
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});