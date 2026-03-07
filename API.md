# Futuro Mentoria – API

API REST para o frontend **futuro-mentoria-frontend**. Todas as rotas estão sob o prefixo `/api`.

## Contrato de dados (frontend ↔ backend)

- **Objeto usuário:** a API sempre usa a propriedade **`role`** (não `userType`). Ex.: em `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/admin/users`, etc., o usuário vem como `{ id, name, email, role: "student" | "mentor" | "admin", ... }`.
- Mantenha este contrato para frontend e backend “falarem a mesma língua”.

## Configuração

- **CORS**: `config/cors.ts` permite credenciais e métodos GET, HEAD, POST, PUT, PATCH, DELETE.
- **Autenticação**: sessão (cookie). Rotas protegidas retornam `401` em JSON quando não autenticado.
- No frontend, defina `NEXT_PUBLIC_API_URL` (ex.: `http://localhost:3333`) e use `credentials: 'include'` nas requisições.

## Rotas

### Auth (público / protegido)

- `POST /api/auth/login` – body: `{ email, password }`
- `POST /api/auth/register` – body: `{ name, email, password, phone?, role, grade?, specialties? }`
- `POST /api/auth/logout` – requer auth
- `GET /api/auth/me` – requer auth

### Público

- `GET /api/mentors?date=YYYY-MM-DD` – lista mentores com horários disponíveis na data
- `POST /api/appointments` – criar agendamento (body: studentName, studentEmail, grade, mentorId, subject, date, time, message?)
- `GET /api/rooms/reservations?date=YYYY-MM-DD` – lista **qual sala tem qual mentor e até qual horário** na data

### Estudante (auth)

- `GET /api/student/appointments` – lista agendamentos do estudante
- `GET /api/student/appointments/:id` – detalhe do agendamento

### Feedback (auth)

- `POST /api/feedback` – body: appointmentId, role ('student'|'mentor'), rating?, comment?, satisfaction, topics?

### Mentor (auth)

- `GET /api/mentor/appointments` – lista agendamentos do mentor
- `GET /api/mentor/appointments/:id` – detalhe
- `PATCH /api/mentor/appointments/:id` – body: message?, preparationItems?, status?
- `POST /api/mentor/appointments/:id/materials` – body: name, url, type ('pdf'|'doc'|'link'|'other')
- `GET /api/mentor/availability?date=YYYY-MM-DD` – lista disponibilidades
- `POST /api/mentor/availability` – body: date, times[], status ('available'|'unavailable')
- `PATCH /api/mentor/availability/:id` – body: status
- `DELETE /api/mentor/availability/:id`
- `GET /api/mentor/rooms` – lista salas cadastradas (para escolher ao reservar)
- `GET /api/mentor/room-reservations?dateFrom&dateTo` – minhas reservas de sala
- `POST /api/mentor/room-reservations` – reservar sala: body: `{ roomId, date (YYYY-MM-DD), reservedUntil? (HH:mm) }`
- `DELETE /api/mentor/room-reservations/:id` – cancelar minha reserva

### Admin (auth)

- `GET /api/admin/users?page&limit&search` – lista usuários
- `GET /api/admin/users/:id` – detalhe do usuário
- `POST /api/admin/schedule-config` – body: { days: [...] }
- `POST /api/admin/students/import` – multipart `file`: CSV ou XLSX com colunas **Aluno** e **Série** (opcional **Email**). Alunos criados com senha padrão `trocar123` se não houver coluna de e-mail.
- `GET /api/admin/rooms` – lista salas
- `POST /api/admin/rooms` – criar sala: body: `{ name, code?, location? }`
- `PATCH /api/admin/rooms/:id` – atualizar sala
- `DELETE /api/admin/rooms/:id` – remover sala

## Migrations

```bash
node ace migration:run
```

Certifique-se de que o usuário do banco (ex.: variável `DB_USER`) existe no PostgreSQL.
