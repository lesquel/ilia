<?php

namespace App\Http\Requests;

use App\Services\AmbitoEjercicios;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Validator;

class StoreCodeSubmission extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === 'student';
    }

    public function rules(): array
    {
        return [
            'exercise_id' => ['bail', 'required', 'integer:strict', 'exists:exercises,id'],
            'language' => ['required', 'string', 'in:python,javascript,php'],
            'code' => ['required', 'string', 'max:10000'],
            'history' => ['required', 'array', 'list', 'min:1', 'max:100'],
            'history.*' => ['required', 'array:kind,code,pasted_chars'],
            'history.*.kind' => ['required', 'in:typing,paste'],
            'history.*.code' => ['present', 'nullable', 'string', 'max:10000'],
            'history.*.pasted_chars' => ['required', 'integer:strict', 'between:0,10000'],
            'ai_usage' => ['required', 'in:none,consultation,generation'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $raw = json_decode($this->getContent());
            if (! is_array($raw->history ?? null)) {
                $validator->errors()->add('history', 'El historial debe ser un arreglo JSON.');

                return;
            }

            foreach ($this->input('history') as $index => $step) {
                if (! is_string($raw->history[$index]->code ?? null)) {
                    $validator->errors()->add("history.$index.code", 'El código de cada paso debe ser un texto.');
                }
                if (($step['kind'] === 'paste') !== ($step['pasted_chars'] > 0)) {
                    $validator->errors()->add("history.$index.pasted_chars", 'Indica un tamaño positivo para un pegado y cero para escritura.');
                }
            }

            if (($raw->history[array_key_last($raw->history)]->code ?? null) !== $this->input('code')) {
                $validator->errors()->add('history', 'La última versión debe coincidir con el código entregado.');
            }

            if (! AmbitoEjercicios::query($this->user())->where('exercises.id', $this->input('exercise_id'))->exists()) {
                $validator->errors()->add('exercise_id', 'La tarea no está disponible para esta cuenta.');

                return;
            }

            $language = DB::table('exercises')->where('id', $this->input('exercise_id'))->value('language');
            if ($language !== $this->input('language')) {
                $validator->errors()->add('language', 'Usa el lenguaje de la tarea.');
            }
        }];
    }
}
