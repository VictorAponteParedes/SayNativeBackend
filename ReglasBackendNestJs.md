# Reglas de Arquitectura y Estándares de Ingeniería - NestJS + TypeORM (Backend SayNative)

Este documento define las directrices oficiales, estándares técnicos y arquitectura obligatoria para el backend de **SayNative** construido con **NestJS**, **TypeORM** y **PostgreSQL**.

---

## 1. Stack Tecnológico Oficial

* **Framework:** NestJS 11+ (TypeScript estricto).
* **Base de Datos & ORM:** PostgreSQL 16+ con **TypeORM**.
* **Migraciones:** TypeORM CLI (prohibido `synchronize: true` en entornos de producción).
* **Internacionalización (i18n):** `nestjs-i18n` con detección automática vía header `Accept-Language`.
* **Validación de Datos:** `class-validator` y `class-transformer` con ValidationPipe global estricto.
* **Seguridad & Auth:** Passport, JWT (Access Token de 15m + Refresh Token de 7d con rotación en base de datos), `@nestjs/throttler` (Rate Limiting).
* **Comunicación en Tiempo Real:** `@nestjs/websockets` (Socket.IO) para señalización WebRTC P2P y mensajería instantánea.
* **Desacoplamiento Asíncrono:** `@nestjs/event-emitter` para comunicación basada en eventos entre módulos.
* **Manejo de Archivos:** Módulo dedicado `FilesModule` con almacenamiento local / AWS S3.
* **Gestor de Paquetes:** `npm`.

---

## 2. Arquitectura de Carpetas: *Modular Monolith* (Monolito Modular)

El backend sigue el principio de alta cohesión y bajo acoplamiento. Cada módulo de negocio es autónomo y encapsulado; la comunicación entre módulos se realiza a través de contratos de servicios exportados o eventos asíncronos.

```text
saynative-backend/
├── src/
│   ├── app.module.ts              # Módulo raíz que orquesta los módulos y providers globales
│   ├── main.ts                    # Bootstrap, pipes globales, filtros, interceptores y Swagger
│   │
│   ├── common/                    # Capa Transversal y Compartida
│   │   ├── database/              # Configuración de TypeORM DataSource y migraciones
│   │   ├── decorators/            # @CurrentUser(), @AcceptLang(), @PublicRoute()
│   │   ├── filters/               # AllExceptionsFilter (Manejo global de errores traducidos con i18n)
│   │   ├── guards/                # JwtAuthGuard, RolesGuard, WsJwtGuard
│   │   ├── interceptors/          # TransformResponseInterceptor, LoggingInterceptor
│   │   ├── pipes/                 # ValidationPipe personalizado, ParseUuidPipe
│   │   └── types/                 # ApiResponse<T>, PaginatedResponse<T>, ErrorResponse
│   │
│   ├── config/                    # Configuración tipada y validación de variables de entorno (.env)
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── env.validation.ts      # Validación obligatoria con Joi o Zod
│   │
│   ├── i18n/                      # Diccionarios Multi-Idioma (es, en, pt, fr, ja, zh)
│   │   ├── es/                    # auth.json, calls.json, coins.json, errors.json, support.json
│   │   ├── en/
│   │   ├── pt/
│   │   ├── fr/
│   │   ├── ja/
│   │   └── zh/
│   │
│   └── modules/                   # Módulos de Negocio Desacoplados
│       ├── auth/                  # Registro, login, refresh token, recuperación de contraseña
│       ├── users/                 # Perfil, idiomas del usuario, reputación, datos personales
│       ├── files/                 # Módulo exclusivo de upload, almacenamiento y get de archivos
│       ├── coins/                 # Billetera virtual, compras IAP, recompensas por anuncios, historial
│       ├── calls/                 # Sesiones de llamada, WebRTC Gateway, cálculo de minutos
│       ├── chats/                 # Salas de chat, mensajes de voz, transcripciones, WebSockets
│       ├── notifications/         # Registro de actividad y push notifications
│       └── support/               # Centro de soporte, FAQs y tickets de ayuda
```

---

## 3. Anatomía Estándar de un Módulo de Negocio

Todo módulo dentro de `src/modules/<feature>/` debe seguir esta distribución rigurosa:

```text
src/modules/calls/
├── controllers/
│   └── calls.controller.ts        # Endpoints HTTP REST (delgados, sin lógica de negocio)
├── services/
│   └── calls.service.ts           # Lógica de negocio y transacciones
├── gateways/                      # (Opcional) WebSockets para tiempo real
│   └── calls.gateway.ts
├── entities/
│   └── call-session.entity.ts     # Entidades TypeORM de la tabla
├── dto/
│   ├── initiate-call.dto.ts       # DTO de entrada con decoradores class-validator
│   └── call-session-response.dto.ts
├── events/                        # Eventos que este módulo emite
│   └── call-completed.event.ts
├── interfaces/
│   └── call.interface.ts
└── calls.module.ts                # Configuración del módulo y exportaciones públicas
```

---

## 4. Regla de Oro: Cero Textos Planos con `i18n`

Queda **estrictamente prohibido** escribir mensajes de error, respuestas de éxito o validaciones con texto plano directamente en controladores o servicios.

### 4.1. Detección automática de idioma
Toda petición de la app móvil envía el header:
```http
Accept-Language: es | en | pt | fr | ja | zh
```

### 4.2. Validaciones en DTOs con claves i18n
```typescript
export class CreateUserDto {
  @IsEmail({}, { message: 'errors.auth.invalid_email' })
  email: string;

  @MinLength(8, { message: 'errors.auth.password_min_length' })
  password: string;
}
```

### 4.3. Excepciones de Negocio Traducidas
```typescript
@Injectable()
export class CallsService {
  constructor(private readonly i18n: I18nService) {}

  async initiateCall(callerId: string, receiverId: string, lang: string) {
    const isBusy = await this.checkIfUserIsBusy(receiverId);
    if (isBusy) {
      throw new ConflictException(
        await this.i18n.t('calls.user_busy', { lang })
      );
    }
  }
}
```

---

## 5. Desacoplamiento entre Módulos y Eventos

Para evitar dependencias circulares y código espagueti:

1. **Lectura directa o llamadas síncronas:** Se importa el módulo dependiente (`imports: [CoinsModule]`) y se inyecta su servicio público (`CoinsService`).
2. **Acciones colaterales asíncronas:** Se utiliza `@nestjs/event-emitter`.
   * **Ejemplo:** Cuando una llamada finaliza:
     ```typescript
     // En calls.service.ts
     this.eventEmitter.emit(
       'call.completed',
       new CallCompletedEvent(callId, durationSeconds, callerId, receiverId)
     );
     ```
   * El módulo de **Coins** escucha `@OnEvent('call.completed')` y realiza el cobro/pago.
   * El módulo de **Notifications** escucha `@OnEvent('call.completed')` y envía la notificación push.

---

## 6. Seguridad Transaccional en la Economía de Monedas

Cualquier operación que altere el saldo de monedas del usuario debe ejecutarse obligatoriamente dentro de una transacción atómica con `QueryRunner` de TypeORM con bloqueo pesimista o verificación estricta:

```typescript
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 1. Bloquear y verificar saldo
  // 2. Descontar monedas del estudiante
  // 3. Acreditar monedas al tutor
  // 4. Registrar CoinTransaction inmutable
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

---

## 7. Módulo Dedicado de Archivos (`FilesModule`)

1. Todos los uploads de avatares, audios y capturas pasan por `FilesController`.
2. Las imágenes se procesan (redimensión y conversión a WebP) para ahorrar ancho de banda móvil.
3. Se genera un `FileEntity` asociado al usuario que lo subió.
4. El resto de módulos solo guardan la referencia al archivo o su URL pública.

---

## 8. Estándar de Respuesta Unificada JSON

Todas las respuestas de la API REST deben cumplir con el contrato:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}
```
Un `TransformResponseInterceptor` global se encarga de envolver automáticamente todas las respuestas exitosas con esta estructura.

---

## 9. Convenciones de Naming y Git

* **Clases y Entidades:** PascalCase (`UserEntity`, `CallsService`, `AuthGateway`).
* **Archivos y Carpetas:** kebab-case (`call-session.entity.ts`, `initiate-call.dto.ts`).
* **Variables y Métodos:** camelCase (`calculateMinutes`, `processPayment`).
* **Commits:** En español, concisos, con tags semánticos (`feat:`, `fix:`, `refactor:`, `chore:`).
