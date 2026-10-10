/*
 * CAMINHOS DE PROPÓSITO — script compartilhado das jornadas
 *
 * Cada página de jornada (home.html, e depois a de oração) define antes
 * deste arquivo uma configuração em window.JORNADA:
 *
 *   window.JORNADA = {
 *     prefixo: "proposito_dia",      // chaves do progresso: proposito_dia1 ... proposito_dia40
 *     total: 40,                     // quantidade de dias
 *     diasPublicados: 40,            // dias que já têm página; os demais abrem em-breve.html
 *     paginaDia: n => `dia${n}.html`,
 *     paginaEmBreve: "em-breve.html",
 *     titulos: ["", "Título do dia 1", ...],
 *     proximaJornada: { href: "oracao.html", texto: "40 Dias de Oração" }
 *   };
 *
 * Cada jornada usa o seu próprio prefixo, então o progresso nunca é compartilhado
 * (proposito_dia1..40 para esta; oracao_dia1..40 para a de oração).
 * O tema (claro/escuro) usa a chave "tema" e vale para o site todo.
 *
 * A página precisa ter estes elementos (por id):
 *   tema, diaAtualTexto, barra, barraTrilho, progressoTexto, diaAtualTitulo,
 *   continuar, recomecar, concluida, rever, proxima, dias, confirmar
 */

(function () {
    "use strict";

    var C = window.JORNADA;
    if (!C) { return; }

    var TOTAL = C.total || 40;
    var POR_GRUPO = C.diasPorGrupo || 7;
    var CHAVE_TEMA = C.chaveTema || "tema";
    var PUBLICADOS = typeof C.diasPublicados === "number" ? C.diasPublicados : TOTAL;

    function $(id) { return document.getElementById(id); }

    /* ---------- armazenamento (nunca quebra se estiver bloqueado) ---------- */

    function ler(chave) {
        try { return localStorage.getItem(chave); } catch (erro) { return null; }
    }

    function gravar(chave, valor) {
        try { localStorage.setItem(chave, valor); } catch (erro) { /* segue sem salvar */ }
    }

    function remover(chave) {
        try { localStorage.removeItem(chave); } catch (erro) { /* segue sem apagar */ }
    }

    /* ---------- regras da jornada ---------- */

    function concluido(n) {
        return ler(C.prefixo + n) === "concluido";
    }

    function publicado(n) {
        return n <= PUBLICADOS;
    }

    function hrefDia(n) {
        return publicado(n) ? C.paginaDia(n) : (C.paginaEmBreve || "em-breve.html");
    }

    function estado() {
        var feitos = 0;
        var atual = null;

        for (var i = 1; i <= TOTAL; i++) {
            if (concluido(i)) {
                feitos++;
            } else if (atual === null) {
                atual = i;
            }
        }

        return {
            feitos: feitos,
            atual: atual === null ? TOTAL : atual,
            completo: feitos === TOTAL
        };
    }

    /* ---------- pequenos construtores de DOM ---------- */

    function criar(tag, classe, texto) {
        var el = document.createElement(tag);
        if (classe) { el.className = classe; }
        if (texto !== undefined) { el.textContent = texto; }
        return el;
    }

    function emojiDecorativo(emoji) {
        var span = criar("span", "", emoji);
        span.setAttribute("aria-hidden", "true");
        return span;
    }

    function definirBotao(botao, simbolo, texto) {
        botao.textContent = "";
        botao.appendChild(emojiDecorativo(simbolo));
        botao.appendChild(document.createTextNode(" " + texto));
    }

    /* ---------- progresso ---------- */

    function atualizarProgresso(e) {
        var exato = (e.feitos / TOTAL) * 100;
        var arredondado = Math.round(exato);

        $("barra").style.width = exato + "%";

        var trilho = $("barraTrilho");
        trilho.setAttribute("aria-valuenow", String(arredondado));
        trilho.setAttribute("aria-valuetext", e.feitos + " de " + TOTAL + " dias concluídos");

        $("diaAtualTexto").textContent = e.atual + " de " + TOTAL;

        $("progressoTexto").textContent =
            e.feitos + " de " + TOTAL + " dias concluídos (" + arredondado + "%)";

        var botao = $("continuar");
        var titulo = $("diaAtualTitulo");

        if (e.completo) {
            botao.href = hrefDia(1);
            definirBotao(botao, "↺", "Revisar a jornada");
            titulo.textContent = "";
        } else {
            botao.href = hrefDia(e.atual);
            definirBotao(botao, "▶", e.feitos === 0 ? "Começar leitura" : "Continuar leitura");
            titulo.textContent = "Dia " + e.atual + ": " + (C.titulos[e.atual] || "");
        }

        $("recomecar").hidden = e.feitos === 0;

        var concluida = $("concluida");
        concluida.hidden = !e.completo;
        $("rever").href = hrefDia(1);

        var proxima = $("proxima");
        if (C.proximaJornada) {
            proxima.href = C.proximaJornada.href;
            proxima.textContent = "Conhecer " + C.proximaJornada.texto + " →";
        } else {
            proxima.hidden = true;
        }
    }

    /* ---------- capítulos agrupados por semana ---------- */

    function criarCartao(n, e) {
        var feito = concluido(n);
        var liberado = n === 1 || concluido(n - 1);
        var disponivel = feito || liberado;

        var classe = "lock";
        var emoji = "🔒";
        var rotulo = "bloqueado";

        if (feito) {
            classe = "done";
            emoji = "✅";
            rotulo = "concluído";
        } else if (liberado) {
            classe = "current";
            emoji = "📖";
            rotulo = "disponível";
        }

        var cartao = criar(disponivel ? "a" : "div", "day " + classe);

        if (disponivel) {
            cartao.href = hrefDia(n);

            if (n === e.atual && !e.completo) {
                cartao.className += " atual";
                cartao.setAttribute("aria-current", "step");
            }
        } else {
            cartao.setAttribute("aria-disabled", "true");
        }

        var titulo = criar("h3", "day-titulo");
        titulo.appendChild(emojiDecorativo(emoji));
        titulo.appendChild(document.createTextNode(" Dia " + n));
        titulo.appendChild(criar("span", "sr-only", " (" + rotulo + ")"));

        cartao.appendChild(titulo);
        cartao.appendChild(criar("p", "day-texto", C.titulos[n] || ""));

        if (disponivel && !publicado(n)) {
            cartao.appendChild(criar("span", "day-aviso", "Em breve"));
        }

        return cartao;
    }

    function renderizar(e) {
        var container = $("dias");

        // guarda quais semanas o leitor abriu ou fechou manualmente
        var manuais = {};
        var existentes = container.querySelectorAll("details[data-g]");
        for (var k = 0; k < existentes.length; k++) {
            manuais[existentes[k].getAttribute("data-g")] = existentes[k].open;
        }

        container.textContent = "";

        var grupos = Math.ceil(TOTAL / POR_GRUPO);

        for (var g = 0; g < grupos; g++) {
            var inicio = g * POR_GRUPO + 1;
            var fim = Math.min(inicio + POR_GRUPO - 1, TOTAL);
            var totalGrupo = fim - inicio + 1;

            var feitosGrupo = 0;
            for (var i = inicio; i <= fim; i++) {
                if (concluido(i)) { feitosGrupo++; }
            }

            var semana = criar("details", "semana");
            semana.setAttribute("data-g", String(g));
            semana.open = Object.prototype.hasOwnProperty.call(manuais, String(g))
                ? manuais[String(g)]
                : feitosGrupo < totalGrupo;

            var resumo = criar("summary", "semana-resumo");

            var esquerda = criar("span", "semana-nome");
            esquerda.appendChild(criar("span", "semana-titulo", "Semana " + (g + 1)));
            esquerda.appendChild(criar("span", "semana-dias", "dias " + inicio + " a " + fim));

            var contagem = criar("span", "semana-contagem",
                feitosGrupo + " de " + totalGrupo + " concluídos");

            resumo.appendChild(esquerda);
            resumo.appendChild(contagem);
            semana.appendChild(resumo);

            var grade = criar("div", "grid");
            for (var n = inicio; n <= fim; n++) {
                grade.appendChild(criarCartao(n, e));
            }

            semana.appendChild(grade);
            container.appendChild(semana);
        }
    }

    function atualizar() {
        var e = estado();
        atualizarProgresso(e);
        renderizar(e);
    }

    /* ---------- recomeçar ---------- */

    function apagarProgresso() {
        for (var i = 1; i <= TOTAL; i++) {
            remover(C.prefixo + i);
        }

        // semanas voltam ao padrão (abertas) depois de recomeçar
        $("dias").textContent = "";
        atualizar();
        window.scrollTo(0, 0);
    }

    function configurarRecomecar() {
        var dialogo = $("confirmar");

        $("recomecar").addEventListener("click", function () {
            if (typeof dialogo.showModal !== "function") {
                if (window.confirm("Apagar o progresso dos " + TOTAL + " dias neste aparelho e recomeçar?")) {
                    apagarProgresso();
                }
                return;
            }

            dialogo.returnValue = "";
            dialogo.showModal();
        });

        dialogo.addEventListener("close", function () {
            if (dialogo.returnValue === "confirmar") {
                apagarProgresso();
            }
        });
    }

    /* ---------- tema ---------- */

    function aplicarTema(escuro) {
        document.documentElement.classList.toggle("dark", escuro);

        var botao = $("tema");
        botao.textContent = escuro ? "☀️" : "🌙";
        botao.setAttribute("aria-pressed", String(escuro));
    }

    function temaInicial() {
        var salvo = ler(CHAVE_TEMA);

        if (salvo === "dark") { return true; }
        if (salvo === "light") { return false; }

        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    function configurarTema() {
        aplicarTema(temaInicial());

        $("tema").addEventListener("click", function () {
            var escuro = !document.documentElement.classList.contains("dark");
            aplicarTema(escuro);
            gravar(CHAVE_TEMA, escuro ? "dark" : "light");
        });
    }

    /* ---------- início ---------- */

    configurarTema();
    configurarRecomecar();
    atualizar();

    // volta pelo botão "voltar" do navegador (página restaurada do cache)
    window.addEventListener("pageshow", function (evento) {
        if (evento.persisted) { atualizar(); }
    });

    // progresso alterado em outra aba
    window.addEventListener("storage", atualizar);
})();
