# FIELBET

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
# FielBet

---

## Configuração de Cron Jobs

Para que a plataforma funcione corretamente, é essencial configurar os seguintes cron jobs em um serviço como [Cron-Job.org](https://cron-job.org/) ou similar.

| Endpoint (URL)                     | Função                                                               | Frequência Recomendada |
| ---------------------------------- | -------------------------------------------------------------------- | ---------------------- |
| `/api/cron/update-matches`         | Atualiza a lista de partidas e cotações (odds) da API externa.       | A cada **30 minutos**  |
| `/api/cron/process`                | Paga as apostas de partidas que já terminaram.                       | A cada **5 minutos**   |
| `/api/cron/notify`                 | Envia notificações no Discord para jogos que começam em breve.        | A cada **5 minutos**   |
| `/api/cron/mvp`                    | Finaliza as votações de MVP que já expiraram.                        | A cada **2 minutos**   |
| `/api/cron/quiz-scheduler`         | Verifica se há quizzes agendados para serem iniciados.               | A cada **1 minuto**    |
| `/api/cron/news`                   | Sincroniza os posts do canal de notícias do Discord com o site.      | A cada **1 hora**      |

**Importante:**
*   Para configurar, você deve usar a URL completa do seu site. Ex: `https://seusite.com/api/cron/update-matches`.
*   Você também precisará configurar um cabeçalho de autorização (`Authorization`) com o valor `Bearer SEU_CRON_SECRET`, onde `SEU_CRON_SECRET` é a variável de ambiente que você definiu.
