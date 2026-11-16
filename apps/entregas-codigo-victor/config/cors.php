<?php

return [
    'paths' => ['acceso/csrf', 'acceso/login'],
    'allowed_methods' => ['GET', 'POST'],
    'allowed_origins' => [env('ILIA_WEB_ORIGIN', 'http://localhost:8081')],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'X-CSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
