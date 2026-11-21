<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class AmbitoEjercicios
{
    public static function query(User $user): Builder
    {
        return DB::table('exercises')->whereExists(function (Builder $query) use ($user) {
            $query->selectRaw('1')->from('users as owner')
                ->whereColumn('owner.id', 'exercises.instructor_id');
            if ($user->ilia_user_id) {
                $query->whereNotNull('owner.ilia_user_id');
            } else {
                $query->whereNull('owner.ilia_user_id');
            }
        });
    }
}
