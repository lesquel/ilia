<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $passwords = [
            'instructor' => config('practica.instructor_password'),
            'student' => config('practica.student_password'),
        ];

        foreach ($passwords as $password) {
            if (! is_string($password) || strlen($password) < 12 || strlen($password) > 64) {
                throw new RuntimeException('Configura ambas contraseñas de práctica con 12 a 64 bytes.');
            }
        }

        DB::transaction(function () use ($passwords) {
            foreach ($passwords as $role => $password) {
                $user = User::firstOrNew(['email' => $role.'@practica.test']);
                $user->name = $role === 'student' ? 'Estudiante de práctica' : 'Instructor de práctica';
                $user->password = $password;
                $user->role = $role;
                $user->save();
            }

            DB::table('exercises')->updateOrInsert(
                ['id' => 1],
                [
                    'instructor_id' => User::where('email', 'instructor@practica.test')->value('id'),
                    'title' => 'Suma de una lista',
                    'instructions' => 'Escribe en Python una función suma(numeros) que devuelva el total y retorne 0 si la lista está vacía.',
                    'language' => 'python',
                ],
            );
        });
    }
}
