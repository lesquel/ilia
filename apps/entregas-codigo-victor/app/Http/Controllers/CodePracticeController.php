<?php

namespace App\Http\Controllers;

use App\Data\CodeSubmission;
use App\Services\AmbitoEjercicios;
use App\Http\Requests\StoreCodeSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CodePracticeController extends Controller
{
    public function csrf(): JsonResponse
    {
        return response()->json(['token' => csrf_token()])->header('Cache-Control', 'no-store');
    }

    public function login(Request $request): JsonResponse
    {
        abort_unless(config('ilia.practice_enabled'), 404);
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        if (! Auth::attempt($credentials + ['ilia_user_id' => null])) {
            return response()->json(['message' => 'El correo o la contraseña del módulo son incorrectos.'], 422);
        }

        $request->session()->forget('ilia_identity');
        $request->session()->regenerate();

        return response()->json(['role' => $request->user()->role])->header('Cache-Control', 'no-store');
    }

    public function practiceForm()
    {
        abort_unless(config('ilia.practice_enabled'), 404);

        return view('practice-login');
    }

    public function practiceLogin(Request $request)
    {
        $response = $this->login($request);
        if ($response->getStatusCode() !== 200) {
            return back()->withErrors(['email' => 'El correo o la contraseña de práctica son incorrectos.']);
        }

        return redirect()->route('module.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->away(rtrim(config('practica.ilia_origin'), '/').'/login');
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();
        $query = AmbitoEjercicios::query($user)->select('exercises.*')->orderBy('exercises.id');
        $submissionCount = DB::table('submissions')
            ->selectRaw('count(*)')
            ->whereColumn('submissions.exercise_id', 'exercises.id');

        if ($user->role === 'student') {
            $submissionCount->where('student_id', $user->id);

            return view('student-home', [
                'studentName' => $user->name,
                'exercises' => $query->selectSub($submissionCount, 'submission_count')
                    ->get(),
            ]);
        }

        abort_unless($user->role === 'instructor', 403);

        return view('instructor', [
            'instructorName' => $user->name,
            'exercises' => $query->where('instructor_id', $user->id)
                ->selectSub($submissionCount, 'submission_count')
                ->get(),
        ]);
    }

    public function instructorExercise(Request $request, int $id)
    {
        $user = $request->user();
        abort_unless($user->role === 'instructor', 403);

        $exercise = DB::table('exercises')->where('instructor_id', $user->id)->find($id);
        abort_unless($exercise, 404);

        $submissions = DB::table('submissions')
            ->join('users', 'users.id', '=', 'submissions.student_id')
            ->where('submissions.exercise_id', $exercise->id)
            ->select('submissions.id', 'users.name')
            ->orderByDesc('submissions.id')
            ->get();

        return view('instructor-exercise', compact('exercise', 'submissions'));
    }

    public function exercise(Request $request, int $id)
    {
        abort_unless($request->user()->role === 'student', 403);
        $exercise = AmbitoEjercicios::query($request->user())->where('exercises.id', $id)->first();

        abort_unless($exercise, 404);

        return view('student', ['exercise' => $exercise]);
    }

    public function createExercise(Request $request)
    {
        abort_unless($request->user()->role === 'instructor', 403);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'instructions' => ['required', 'string', 'max:4000'],
            'language' => ['required', 'in:python,javascript,php'],
        ]);

        DB::table('exercises')->insert($data + ['instructor_id' => $request->user()->id]);

        return back()->with('success', 'Tarea creada.');
    }

    public function store(StoreCodeSubmission $request): JsonResponse
    {
        $submission = CodeSubmission::fromValidated($request->validated());
        $time = now();
        $id = DB::table('submissions')->insertGetId([
            'exercise_id' => $submission->exerciseId,
            'student_id' => $request->user()->id,
            'code' => $submission->code,
            'history' => json_encode($submission->history, JSON_THROW_ON_ERROR),
            'ai_usage' => $submission->aiUsage,
            'submitted_at' => $time,
        ]);

        return response()->json(['data' => [
            'submission_id' => $id,
            'exercise_id' => $submission->exerciseId,
            'submitted_at' => $time->toISOString(),
            ...CodeSubmission::summary($submission->history),
        ]], 201);
    }

    public function review(Request $request, int $id)
    {
        abort_unless($request->user()->role === 'instructor', 403);
        $submission = DB::table('submissions')
            ->join('exercises', 'exercises.id', '=', 'submissions.exercise_id')
            ->join('users', 'users.id', '=', 'submissions.student_id')
            ->where('submissions.id', $id)
            ->where('exercises.instructor_id', $request->user()->id)
            ->select('submissions.*', 'exercises.title', 'users.name')
            ->first();

        abort_unless($submission, 404);
        $history = json_decode($submission->history, true, flags: JSON_THROW_ON_ERROR);

        return view('review', [
            'submission' => $submission,
            'history' => $history,
            'summary' => CodeSubmission::summary($history),
        ]);
    }
}
