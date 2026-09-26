<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-admin 
                            {--email= : The email address for the administrator}
                            {--name= : The full name of the administrator}
                            {--password= : The secure password (prompted if omitted)}
                            {--super-admin : Provision directly with Super Admin privileges}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Provision a secure administrator account for production or local deployment';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('Administrator Email');
        $name = $this->option('name') ?: $this->ask('Administrator Name', 'System Administrator');
        $password = $this->option('password') ?: $this->secret('Administrator Password (min 8 chars)');
        $isSuperAdmin = (bool) $this->option('super-admin');

        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'password' => $password,
        ], [
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $admin = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
            'is_super_admin' => $isSuperAdmin,
            'company_name' => 'Ayaan Clothing Ltd.',
            'email_verified_at' => now(),
        ]);

        $roleTitle = $isSuperAdmin ? 'Super Administrator' : 'Administrator';
        $this->info("{$roleTitle} [{$admin->email}] successfully created with ID: {$admin->id}");
        return self::SUCCESS;
    }
}
