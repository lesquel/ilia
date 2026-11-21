<?php

namespace App\Services;

use App\Http\Requests\StoreCodeSubmission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class NormalizadorEntrega
{
    public function desdeWeb(array $entrada): array
    {
        Validator::make(['entrada' => $entrada], [
            'entrada' => ['array:exercise_id,language,code,history,ai_usage'],
        ])->validate();

        return $this->validarContrato($entrada);
    }

    public function desdeExterno(array $entrada): array
    {
        Validator::make(['entrada' => $entrada], [
            'entrada' => ['required', 'array:tarea,lenguaje,codigoFuente,pasos,asistencia'],
            'entrada.tarea' => ['required', 'array:id'],
            'entrada.tarea.id' => ['required'],
            'entrada.lenguaje' => ['required', 'string'],
            'entrada.codigoFuente' => ['required', 'string', 'max:10000'],
            'entrada.pasos' => ['required', 'array', 'list', 'min:1', 'max:100'],
            'entrada.pasos.*' => ['required', 'array:accion,contenido,caracteresPegados'],
            'entrada.pasos.*.accion' => ['required', 'string'],
            'entrada.pasos.*.contenido' => ['present', 'string', 'max:10000'],
            'entrada.pasos.*.caracteresPegados' => ['required'],
            'entrada.asistencia' => ['required', 'string'],
        ])->validate();

        $acciones = ['escritura' => 'typing', 'pegado' => 'paste'];
        $asistencias = ['ninguna' => 'none', 'consulta' => 'consultation', 'generacion' => 'generation'];

        $history = [];
        foreach ($entrada['pasos'] as $indice => $paso) {
            $history[] = [
                'kind' => $this->traducir($paso['accion'], $acciones, "pasos.$indice.accion"),
                'code' => $paso['contenido'],
                'pasted_chars' => $this->entero($paso['caracteresPegados'], "pasos.$indice.caracteresPegados"),
            ];
        }

        return $this->validarContrato([
            'exercise_id' => $this->entero($entrada['tarea']['id'], 'tarea.id'),
            'language' => $entrada['lenguaje'],
            'code' => $entrada['codigoFuente'],
            'history' => $history,
            'ai_usage' => $this->traducir($entrada['asistencia'], $asistencias, 'asistencia'),
        ]);
    }

    private function validarContrato(array $datos): array
    {
        if (isset($datos['language']) && is_string($datos['language'])) {
            $datos['language'] = strtolower(trim($datos['language']));
        }

        $reglas = (new StoreCodeSubmission)->rules();
        $reglas['exercise_id'][] = 'min:1';
        $reglas['history.*.code'] = ['present', 'string', 'max:10000'];
        $reglas['history.*.kind'] = ['required', 'string', 'in:typing,paste'];
        $reglas['ai_usage'] = ['required', 'string', 'in:none,consultation,generation'];

        $datos = Validator::make($datos, $reglas, [
            'required' => 'El campo :attribute es obligatorio.',
            'integer' => 'El campo :attribute debe ser un entero JSON.',
            'string' => 'El campo :attribute debe ser un texto.',
            'array' => 'El campo :attribute debe ser un arreglo con las claves permitidas.',
            'list' => 'El campo :attribute debe ser una lista ordenada.',
            'in' => 'El campo :attribute contiene un valor no admitido.',
            'exists' => 'La tarea indicada no existe.',
        ])->validate();

        foreach ($datos['history'] as $indice => $paso) {
            if (($paso['kind'] === 'paste') !== ($paso['pasted_chars'] > 0)) {
                throw ValidationException::withMessages([
                    "history.$indice.pasted_chars" => 'Usa cero para escritura y un entero positivo para pegado.',
                ]);
            }
        }

        if ($datos['history'][array_key_last($datos['history'])]['code'] !== $datos['code']) {
            throw ValidationException::withMessages([
                'history' => 'El último paso debe coincidir exactamente con el código final.',
            ]);
        }

        $lenguaje = DB::table('exercises')->where('id', $datos['exercise_id'])->value('language');
        if ($lenguaje !== $datos['language']) {
            throw ValidationException::withMessages(['language' => 'El lenguaje debe coincidir con la tarea.']);
        }

        return [
            'exercise_id' => $datos['exercise_id'],
            'language' => $datos['language'],
            'code' => $datos['code'],
            'history' => $datos['history'],
            'ai_usage' => $datos['ai_usage'],
        ];
    }

    private function entero(mixed $valor, string $campo): int
    {
        if (is_int($valor)) {
            return $valor;
        }

        // Un número entero en texto tiene dígitos, sin signo, decimal ni exponente.
        if (is_string($valor) && preg_match('/^[0-9]+$/D', $valor)) {
            $digitos = ltrim($valor, '0');
            $digitos = $digitos === '' ? '0' : $digitos;
            $limite = (string) PHP_INT_MAX;

            if (strlen($digitos) < strlen($limite)
                || (strlen($digitos) === strlen($limite) && strcmp($digitos, $limite) <= 0)) {
                return (int) $digitos;
            }
        }

        throw ValidationException::withMessages([
            $campo => 'Se requiere un entero o una cadena de dígitos dentro del rango permitido.',
        ]);
    }

    private function traducir(string $valor, array $equivalencias, string $campo): string
    {
        $valor = strtolower(trim($valor));
        if (! array_key_exists($valor, $equivalencias)) {
            throw ValidationException::withMessages([$campo => 'El valor recibido no tiene una equivalencia definida.']);
        }

        return $equivalencias[$valor];
    }
}
