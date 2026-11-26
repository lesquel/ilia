<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AgendaEvent extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';
    protected $guarded = [];
    protected function casts(): array
    {
        return ['datos' => 'array', 'published_at' => 'datetime', 'processed_at' => 'datetime'];
    }
}
