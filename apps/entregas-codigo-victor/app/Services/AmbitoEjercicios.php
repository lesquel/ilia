<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class AmbitoEjercicios
{
    public static function query(User $user): Builder
    {
        $query = DB::table('exercises')->whereExists(function (Builder $query) use ($user) {
            $query->selectRaw('1')->from('users as owner')
                ->whereColumn('owner.id', 'exercises.instructor_id');
            if ($user->ilia_user_id) {
                $query->whereNotNull('owner.ilia_user_id');
            } else {
                $query->whereNull('owner.ilia_user_id');
            }
        });
        if ($user->ilia_user_id && $user->role === 'student' &&
            DB::table('exercises')->whereNotNull('ilia_course_id')->exists()) {
            $ids = array_column(app(CursosIlia::class)->listar(request()), 'id');
            $query->where(function (Builder $scope) use ($ids) {
                $scope->whereNull('exercises.ilia_course_id')->orWhereIn('exercises.ilia_course_id', $ids);
            });
        }
        return $query;
    }
}
