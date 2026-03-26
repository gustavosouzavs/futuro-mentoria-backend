/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'



// ---------------------------------------------------------------------------
// API routes (prefix /api)
// ---------------------------------------------------------------------------

router
  .group(() => {
    // Auth (session cookie)


    router.group(() => {
      router.post('/login', '#controllers/auth_controller.login')
      router.post('/register', '#controllers/auth_controller.register')
      router.post('/logout', '#controllers/auth_controller.logout').use(middleware.apiAuth())
      router.get('/me', '#controllers/auth_controller.me').use(middleware.apiAuth())
      router.patch('/change-password', '#controllers/auth_controller.changePassword').use(middleware.apiAuth())

    }).prefix('auth')

    // Public
    router.get('/mentors', '#controllers/mentors_controller.index')
    router.post('/appointments', '#controllers/appointments_controller.store')
    router.get('/rooms/reservations', '#controllers/room_reservations_controller.index')

    router
      .get('/material-files/:id', '#controllers/material_files_controller.show')
      .use(middleware.apiAuth())

    // Student (authenticated)
    router
      .group(() => {
        router.get('/appointments', '#controllers/student_appointments_controller.index')
        router.get('/appointments/:id', '#controllers/student_appointments_controller.show')
        router.patch(
          '/appointments/:id/preparation-items',
          '#controllers/student_appointments_controller.updatePreparationItems'
        )
        router.post(
          '/appointments/:id/materials/upload',
          '#controllers/student_materials_controller.store'
        )
      })
      .prefix('student')
      .use(middleware.apiAuth())

    // Feedback (authenticated)
    router.post('/feedback', '#controllers/feedback_controller.store').use(middleware.apiAuth())

    // Mentor (authenticated)
    router
      .group(() => {
        router.get('/appointments', '#controllers/mentor_appointments_controller.index')
        router.get('/appointments/:id', '#controllers/mentor_appointments_controller.show')
        router.patch('/appointments/:id', '#controllers/mentor_appointments_controller.update')
        router.post('/appointments/:id/materials', '#controllers/mentor_materials_controller.store')
        router.post('/appointments/:id/materials/upload', '#controllers/mentor_materials_controller.upload')
        router.get('/availability', '#controllers/mentor_availability_controller.index')
        router.post('/availability', '#controllers/mentor_availability_controller.store')
        router.patch('/availability/:id', '#controllers/mentor_availability_controller.update')
        router.delete('/availability/:id', '#controllers/mentor_availability_controller.destroy')
        router.get('/rooms', '#controllers/mentor_room_reservations_controller.rooms')
        router.get('/room-reservations', '#controllers/mentor_room_reservations_controller.index')
        router.post('/room-reservations', '#controllers/mentor_room_reservations_controller.store')
        router.delete('/room-reservations/:id', '#controllers/mentor_room_reservations_controller.destroy')
        router.get('/schedule-config', '#controllers/mentor_schedule_controller.index')
      })
      .prefix('mentor')
      .use(middleware.apiAuth())

    // Admin (authenticated)
    router
      .group(() => {
        router.get('/metrics', '#controllers/admin_metrics_controller.index')
        router.get('/appointments', '#controllers/admin_appointments_controller.index')
        router.get('/users', '#controllers/admin_users_controller.index')
        router.get('/users/:id', '#controllers/admin_users_controller.show')
        router.patch('/users/:id', '#controllers/admin_users_controller.update')
        router.get('/schedule-config', '#controllers/admin_schedule_controller.index')
        router.post('/schedule-config', '#controllers/admin_schedule_controller.store')
        router.post('/students/import', '#controllers/admin_students_import_controller.store')
        router.get('/rooms', '#controllers/admin_rooms_controller.index')
        router.post('/rooms', '#controllers/admin_rooms_controller.store')
        router.patch('/rooms/:id', '#controllers/admin_rooms_controller.update')
        router.delete('/rooms/:id', '#controllers/admin_rooms_controller.destroy')
      })
      .prefix('admin')
      .use(middleware.apiAuth())
  })
  .prefix('/api')
