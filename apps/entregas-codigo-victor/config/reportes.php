<?php

return [
    'rabbitmq' => [
        'host' => env('RABBITMQ_HOST', '127.0.0.1'),
        'port' => (int) env('RABBITMQ_PORT', 5673),
        'user' => env('RABBITMQ_USER'),
        'password' => env('RABBITMQ_PASSWORD'),
        'vhost' => env('RABBITMQ_VHOST', 'ilia_victor'),
        'queue' => env('RABBITMQ_QUEUE', 'ilia.victor.reportes'),
    ],
];
