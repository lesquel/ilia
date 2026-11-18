<?php

namespace App\Http\Controllers;

use App\Services\NormalizadorEntrega;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use JsonException;

class NormalizacionEntregaController extends Controller
{
    public function web(Request $request, NormalizadorEntrega $normalizador): JsonResponse
    {
        $entrada = $this->leerJson($request, 'history');

        return response()->json(['data' => $normalizador->desdeWeb($entrada)]);
    }

    public function externo(Request $request, NormalizadorEntrega $normalizador): JsonResponse
    {
        $entrada = $this->leerJson($request, 'pasos');

        return response()->json(['data' => $normalizador->desdeExterno($entrada)]);
    }

    private function leerJson(Request $request, string $historial): array
    {
        abort_unless($request->user()->role === 'student', 403);

        // Leemos el cuerpo original para conservar la sangría y las cadenas vacías del código.
        try {
            $objeto = json_decode($request->getContent(), flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ValidationException::withMessages(['json' => 'El cuerpo debe contener un JSON válido.']);
        }

        if (! $objeto instanceof \stdClass) {
            throw ValidationException::withMessages(['json' => 'La raíz del JSON debe ser un objeto.']);
        }

        if (property_exists($objeto, $historial) && ! is_array($objeto->{$historial})) {
            throw ValidationException::withMessages([$historial => 'El historial debe ser un arreglo JSON.']);
        }

        return json_decode($request->getContent(), true, flags: JSON_THROW_ON_ERROR);
    }
}
