<?php

return [
    'api_url' => env('ILIA_API_URL', 'http://localhost:8000/api/v1'),
    'shared_secret' => env('ILIA_MODULE_SHARED_SECRET', ''),
    'practice_enabled' => env('ILIA_PRACTICE_ENABLED', true),
];
