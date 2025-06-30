# 🚀 Guia do Painel de Administração FielBet 🚀

Bem-vindo(a), admin! Este guia é seu manual completo para gerenciar todos os aspectos da plataforma FielBet.

---

## 🔑 Acesso

Para acessar o painel, faça login no site com uma conta que tenha permissões de administrador. Um link para o "Painel" aparecerá no menu do seu perfil.

---

## 📊 Dashboard

É a sua visão geral da plataforma. Aqui você encontra:
- **Estatísticas Principais:** Total apostado, lucro, número de usuários e total de apostas.
- **Gráficos de Desempenho:** Acompanhe o volume de apostas e a lucratividade ao longo do tempo.
- **Rankings Rápidos:** Veja os top 5 usuários em diferentes categorias (Maiores Apostadores, Mais Ricos, etc.).
- **Ações Rápidas:** Botões para executar tarefas manuais importantes, como atualizar partidas ou pagar apostas.
- **Comunicados:** Envie notificações globais para todos os usuários, VIPs ou não-VIPs.

---

## 🛠️ Gerenciamento

### Partidas
A lista de todas as partidas importadas da API.
- **Resolver Partida:** Paga manualmente as apostas de uma partida finalizada.
- **Criar Bolão/MVP:** Inicia eventos específicos para uma partida.

### Campeonatos
Controle quais ligas e campeonatos aparecem no site.
- **Ativar/Desativar:** Apenas campeonatos ativos terão suas partidas atualizadas pela API.
- **Adicionar Novo:** Adicione novas ligas informando o ID da API e a temporada.

### Apostas
Visualize todas as apostas feitas pelos usuários, com filtros por status (Em Aberto, Ganhos, etc.).

### Usuários
Gerencie todos os membros da plataforma. Visualize perfis, saldos e estatísticas.

### Compras
Visualize o histórico de todas as compras feitas na loja do site e pode reembolsar ou excluir registros se necessário.

---

## ✨ Comunidade & Eventos

### MVP Votação
Crie e gerencie votações de "Melhor da Partida".
- A votação é criada para uma partida **já finalizada**.
- O sistema busca os jogadores que participaram e permite que os usuários votem.
- O admin pode finalizar a votação manualmente ou esperar o cron job.

### Níveis
Configure a progressão de níveis dos usuários, definindo o XP necessário, nome de cada nível e as recompensas (dinheiro, cargos no Discord, etc.).

### Posts
Crie e gerencie as notícias e comunicados que aparecem na página "Notícias".
- **Sincronizar com Discord:** Importa automaticamente posts feitos no canal de notícias do Discord para o site.
- **Fixar Post:** Mantém um post importante no topo do feed.

### Transmissão
Gerencie as transmissões ao vivo da comunidade.
- Adicione múltiplas fontes (iFrame ou HLS) para uma transmissão.
- Ative o "Modo Intervalo" para exibir uma tela de espera.

### Eventos de XP
Crie eventos que multiplicam o XP ganho pelos usuários ao vencerem apostas (ex: "Fim de Semana com XP em Dobro").

### Quiz
Crie quizzes interativos para o bot do Discord.
- **Gerador com IA:** Crie perguntas automaticamente com base em um tema.
- **Agendamento:** Defina horários para o quiz iniciar automaticamente.

### Quem é o Jogador?
Crie jogos de adivinhação sobre jogadores de futebol.
- **Gerador com IA:** Assim como o quiz, a IA pode criar o jogador, dicas e nacionalidade para você.
- **Agendamento Global:** Defina horários e o bot sorteará um dos jogos criados para iniciar no Discord.

---

## 💰 Monetização

### Loja
Crie e gerencie os itens que os usuários podem comprar com o saldo virtual.
- **Tipos de Item:** Cargos no Discord, Bônus de XP, Remoção de Anúncios.

### Anúncios
Gerencie os banners de anúncio que aparecem na plataforma.

### Recompensas
Configure os vídeos de anúncio que os usuários assistem para ganhar a recompensa diária.

### Códigos
Visualize todos os códigos promocionais gerados pelo comando `/gerar_codigo` no Discord e pode revogá-los se necessário.

---

## ⚙️ Configuração

### Servidor
Visualize as estatísticas do seu servidor do Discord e do banco de dados da aplicação.
- **Limpeza de Dados:** Execute uma limpeza para remover dados antigos e otimizar o espaço.

### Bot
Configure todos os IDs de canais e cargos que o bot do Discord precisa para funcionar corretamente.
- **ID do Servidor:** O primeiro e mais importante campo. Preencha e clique em "Carregar" para buscar os canais/cargos.
- **Teste de Canal:** Após configurar um canal, use o botão "Testar" para garantir que o bot consegue enviar mensagens lá.

### Configurações
- **Modo Manutenção/Beta:** Ative modos especiais para restringir o acesso ao site.
- **Chaves de API:** Gerencie suas chaves da API de futebol. O sistema faz um rodízio automático para não exceder o limite diário.

---

## ⏰ Configuração de Cron Jobs

Para que a plataforma funcione corretamente, é essencial configurar os seguintes cron jobs em um serviço como [Cron-Job.org](https://cron-job.org/) ou similar.

| Endpoint (URL)                     | Função                                                               | Frequência Recomendada |
| ---------------------------------- | -------------------------------------------------------------------- | ---------------------- |
| `/api/cron/update-matches`         | Atualiza a lista de partidas e cotações (odds) da API externa.       | A cada **30 minutos**  |
| `/api/cron/process`                | Paga as apostas de partidas que já terminaram.                       | A cada **5 minutos**   |
| `/api/cron/notify`                 | Envia notificações no Discord para jogos que começam em breve.        | A cada **5 minutos**   |
| `/api/cron/mvp`                    | Finaliza as votações de MVP que já expiraram.                        | A cada **2 minutos**   |
| `/api/cron/news`                   | Sincroniza os posts do canal de notícias do Discord com o site.      | A cada **1 hora**      |

**Importante:**
*   Para configurar, você deve usar a URL completa do seu site. Ex: `https://seusite.com/api/cron/update-matches`.
*   Você também precisará configurar um cabeçalho de autorização (`Authorization`) com o valor `Bearer SEU_CRON_SECRET`, onde `SEU_CRON_SECRET` é a variável de ambiente que você definiu.
