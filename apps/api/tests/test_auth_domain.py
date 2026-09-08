import pytest

from app.features.auth.domain.entities import Email, Role, User


class TestEmail:
    def test_is_normalized_so_one_person_cannot_hold_two_accounts(self) -> None:
        assert Email("  Ana.Perez@Colegio.EDU  ") == Email("ana.perez@colegio.edu")

    @pytest.mark.parametrize("value", ["", "   ", "not-an-email"])
    def test_rejects_anything_without_an_at_sign(self, value: str) -> None:
        with pytest.raises(ValueError):
            Email(value)


class TestRole:
    def test_permissions_accumulate_upward(self) -> None:
        assert Role.ADMIN.can_act_as(Role.INSTRUCTOR)
        assert Role.ADMIN.can_act_as(Role.STUDENT)
        assert Role.INSTRUCTOR.can_act_as(Role.STUDENT)

    def test_a_student_cannot_act_as_an_instructor(self) -> None:
        assert not Role.STUDENT.can_act_as(Role.INSTRUCTOR)
        assert not Role.INSTRUCTOR.can_act_as(Role.ADMIN)

    def test_every_role_can_act_as_itself(self) -> None:
        for role in Role:
            assert role.can_act_as(role)


class TestUserRegistration:
    def test_new_accounts_are_always_students(self) -> None:
        user = User.register(
            email=Email("docente@colegio.edu"),
            full_name="Ana Pérez",
            password_hash="hashed::x",
        )

        assert user.role is Role.STUDENT
        assert user.is_active

    def test_name_is_trimmed(self) -> None:
        user = User.register(
            email=Email("docente@colegio.edu"),
            full_name="  Ana Pérez  ",
            password_hash="hashed::x",
        )

        assert user.full_name == "Ana Pérez"

    def test_rejects_a_blank_name(self) -> None:
        with pytest.raises(ValueError):
            User.register(
                email=Email("docente@colegio.edu"),
                full_name="   ",
                password_hash="hashed::x",
            )

    def test_each_registration_gets_its_own_id(self) -> None:
        first = User.register(
            email=Email("a@colegio.edu"), full_name="A", password_hash="hashed::x"
        )
        second = User.register(
            email=Email("b@colegio.edu"), full_name="B", password_hash="hashed::x"
        )

        assert first.id != second.id
