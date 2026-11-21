<?php

return [
    'paths' => ['acceso/csrf', 'acceso/login', 'acceso/ilia'],
    'allowed_methods' => ['GET', 'POST'],
    'allowed_origins' => [env('ILIA_WEB_ORIGIN', 'http://localhost:8081')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-CSRF-TOKEN', 'X-Correlation-ID'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
